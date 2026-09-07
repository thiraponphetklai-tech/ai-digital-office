
import { NextRequest, NextResponse } from 'next/server'
import { getActiveProjectsWithTasks } from '@/lib/projectRepository'
import { getLineDeliveryConfig } from '@/lib/lineConfig'
import { buildAiProjectSummary, buildWbsTaskLines } from '@/lib/lineReport'

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, projectIds } = await request.json().catch(() => ({}))
  const requestedProjectIds = Array.isArray(projectIds) ? projectIds.filter((id): id is string => typeof id === 'string') : projectId ? [projectId] : []
  const selectedProjects = await getActiveProjectsWithTasks(requestedProjectIds)
  if (!selectedProjects.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const messages: { projectId: string; text: string }[] = []
  const skippedProjectIds: string[] = []
  for (const { project, tasks, ownerNames } of selectedProjects) {
    const config = await getLineDeliveryConfig(project.id)
    if (!config) {
      skippedProjectIds.push(project.id)
      continue
    }
    const aiSummary = await buildAiProjectSummary(project, tasks, ownerNames)
    const text = [
        `📊 AI Project Analysis — ${project.name}`,
        `วันที่ ${date}`,
        '',
        ...buildWbsTaskLines(tasks, ownerNames),
        '',
        '🤖 AI Summary:',
        ...aiSummary.map(item => `• ${item}`),
      ].join('\n')
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: config.recipientId, messages: [{ type: 'text', text }] }),
    })
    if (!response.ok) return NextResponse.json({ error: await response.text(), projectId: project.id }, { status: response.status })
    messages.push({ projectId: project.id, text })
  }

  if (!messages.length) return NextResponse.json({ error: 'LINE configuration is not set for the selected projects.', skippedProjectIds }, { status: 500 })
  return NextResponse.json({ sent: true, projectIds: messages.map(message => message.projectId), skippedProjectIds, messages: messages.map(message => message.text) })
}
