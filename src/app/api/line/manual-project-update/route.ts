import { NextRequest, NextResponse } from 'next/server'
import { formatIntelligenceLines, getProjectIntelligence } from '@/lib/projectIntelligence'
import {
  MOCK_BITLOCKER_PROJECT,
  MOCK_DIGITAL_OFFICE_PROJECT,
  MOCK_M365_MIGRATION_PROJECT,
  MOCK_TASKS,
} from '@/data/mockData'

const projects = [MOCK_BITLOCKER_PROJECT, MOCK_M365_MIGRATION_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT]

export async function POST(request: NextRequest) {
  const { projectId } = await request.json().catch(() => ({}))
  const project = projects.find(item => item.id === projectId)

  if (!project) {
    return NextResponse.json({ error: 'This project is not available for the demo LINE update.' }, { status: 404 })
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  if (!token || !recipientId) {
    return NextResponse.json({ error: 'LINE environment variables are not configured' }, { status: 500 })
  }

  const tasks = MOCK_TASKS.filter(task => task.projectId === project.id)
  const intelligence = getProjectIntelligence(project, tasks)
  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const plannedTasks = tasks.filter(task => intelligence.upcomingPlannedTasks.some(action => action.title === task.title))
  const aiSummary = [
    intelligence.attentionTasks.length ? `ติดตาม ${intelligence.attentionTasks.length} งานที่มีความเสี่ยง: ${intelligence.attentionTasks.slice(0, 2).map(task => task.title).join(', ')}` : 'ไม่พบงาน Blocked หรือ At Risk ในขณะนี้',
    ...plannedTasks.slice(0, 2).map(task => `แผนปฏิบัติการ: ${task.description ?? task.title}`),
    intelligence.scheduleDelta < -5 ? 'ความคืบหน้างานต่ำกว่าแผน ควรทบทวนงานบน critical path และเร่งปิด blocker' : intelligence.workloadAlerts.length ? 'พบ resource ใกล้หรือเกิน capacity ควรพิจารณากระจายงานก่อนกระทบกำหนดส่ง' : 'ติดตามงานที่กำลังดำเนินการและ milestone ถัดไปอย่างต่อเนื่อง',
  ]

  const text = [
    `📊 Project Update — ${project.name}`,
    `วันที่ ${date}`,
    '',
    ...formatIntelligenceLines(project, intelligence),
    '',
    '🤖 AI Summary:',
    ...aiSummary.map(item => `• ${item}`),
  ].join('\n')

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: recipientId, messages: [{ type: 'text', text }] }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true, projectId: project.id })
}
