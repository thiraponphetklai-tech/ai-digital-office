import { NextRequest, NextResponse } from 'next/server'
import type { Task } from '@/types'
import { formatIntelligenceLines, getAiRecommendationLines, getProjectIntelligence } from '@/lib/projectIntelligence'
import { getProjectWithTasks } from '@/lib/projectRepository'

export async function POST(request: NextRequest) {
  const { projectId } = await request.json().catch(() => ({}))
  if (typeof projectId !== 'string') return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  const projectData = await getProjectWithTasks(projectId)
  if (!projectData) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const { project, tasks } = projectData

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  if (!token || !recipientId) {
    return NextResponse.json({ error: 'LINE environment variables are not configured' }, { status: 500 })
  }

  const intelligence = getProjectIntelligence(project, tasks)
  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const plannedTasks = tasks.filter((task: Task) => intelligence.upcomingPlannedTasks.some(action => action.title === task.title))
  const aiSummary = [
    intelligence.attentionTasks.length ? `ติดตาม ${intelligence.attentionTasks.length} งานที่มีความเสี่ยง: ${intelligence.attentionTasks.slice(0, 2).map(task => task.title).join(', ')}` : 'ไม่พบงาน Blocked หรือ At Risk ในขณะนี้',
    ...plannedTasks.slice(0, 2).map((task: Task) => `แผนปฏิบัติการ: ${task.description ?? task.title}`),
    ...getAiRecommendationLines(project, intelligence),
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
