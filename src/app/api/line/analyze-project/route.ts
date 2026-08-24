
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
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  if (!token || !recipientId) {
    return NextResponse.json({ error: 'LINE environment variables are not configured' }, { status: 500 })
  }

  const { projectId, projectIds } = await request.json().catch(() => ({}))
  const requestedProjectIds = Array.isArray(projectIds) ? projectIds.filter((id): id is string => typeof id === 'string') : projectId ? [projectId] : []
  const selectedProjects = requestedProjectIds.length
    ? projects.filter(item => requestedProjectIds.includes(item.id))
    : projects.filter(item => item.status === 'ACTIVE')
  if (!selectedProjects.length) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const messages = selectedProjects.map(project => {
    const tasks = MOCK_TASKS.filter(task => task.projectId === project.id)
    const intelligence = getProjectIntelligence(project, tasks)
    const followUps = [...intelligence.attentionTasks, ...tasks.filter(task => task.status === 'IN_PROGRESS')].slice(0, 3)
    const recommendation = intelligence.overdueMilestones.length
      ? 'มี milestone เกินกำหนด ควรทบทวนแผนและกำหนด owner สำหรับ recovery plan ทันที'
      : intelligence.scheduleDelta < -5
        ? 'ความคืบหน้างานต่ำกว่า schedule ควรเร่งงานที่มี dependency และขจัด blocker บน critical path'
        : intelligence.workloadAlerts.length
          ? 'มี resource ใกล้หรือเกิน capacity ควรปรับการมอบหมายงานก่อนกระทบแผน'
          : intelligence.attentionTasks.length
            ? `ติดตาม owner ของ ${intelligence.attentionTasks.length} งานที่มีความเสี่ยงหรือถูก Blocked ก่อน เพื่อป้องกันผลกระทบต่อกำหนดส่ง`
            : 'โครงการอยู่ในสถานะปกติ ให้ติดตาม milestone ถัดไปและงานกำลังดำเนินการอย่างต่อเนื่อง'

    return {
      type: 'text' as const,
      text: [
        `📊 AI Project Analysis — ${project.name}`,
        `วันที่ ${date}`,
        '',
        ...formatIntelligenceLines(project, intelligence),
        '',
        followUps.length ? 'งานที่ควรติดตาม:' : 'สถานะการติดตาม:',
        ...(followUps.length ? followUps.map(task => `• ${task.title} — ${task.blocker || task.description || task.status}`) : ['• ไม่มีงาน Blocked หรือ At Risk ในขณะนี้']),
        '',
        '🤖 AI Recommendation:',
        recommendation,
      ].join('\n'),
    }
  })

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: recipientId, messages }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true, projectIds: selectedProjects.map(project => project.id), messages: messages.map(message => message.text) })
}
