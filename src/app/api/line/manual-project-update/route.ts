import { NextRequest, NextResponse } from 'next/server'
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
  const count = (status: string) => tasks.filter(task => task.status === status).length
  const metricTotal = project.metrics?.reduce((total, metric) => total + metric.total, 0) ?? 0
  const metricCompleted = project.metrics?.reduce((total, metric) => total + metric.completed, 0) ?? 0
  const progress = metricTotal
    ? Number(((metricCompleted / metricTotal) * 100).toFixed(2))
    : tasks.length
      ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length)
      : 0
  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())

  const text = [
    `📊 Project Update — ${project.name}`,
    `วันที่ ${date}`,
    '',
    `Overall progress: ${progress}%${metricTotal ? ` (${metricCompleted.toLocaleString()} / ${metricTotal.toLocaleString()} total units)` : ''}`,
    ...(project.metrics?.map(metric => {
      const metricProgress = ((metric.completed / metric.total) * 100).toFixed(2)
      return `• ${metric.label}: ${metric.completed.toLocaleString()} / ${metric.total.toLocaleString()} ${metric.unit ?? 'เครื่อง'} (${metricProgress}%)${metric.detail ? ` — ${metric.detail}` : ''}`
    }) ?? []),
    '',
    `✅ Done: ${count('DONE')} | 🔵 In progress: ${count('IN_PROGRESS')}`,
    `⚠️ At risk: ${count('AT_RISK')} | 🔴 Blocked: ${count('BLOCKED')} | ⏳ To do: ${count('TODO')}`,
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
