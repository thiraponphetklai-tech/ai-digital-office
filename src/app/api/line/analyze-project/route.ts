
import { NextRequest, NextResponse } from 'next/server'
import { formatIntelligenceLines, getProjectIntelligence } from '@/lib/projectIntelligence'
import { getActiveProjectsWithTasks } from '@/lib/projectRepository'
import { getLineDeliveryConfig } from '@/lib/lineConfig'
import { buildAiProjectSummary, buildWbsTaskLines } from '@/lib/lineReport'

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getLineDeliveryConfig()
  if (!config) {
    return NextResponse.json({ error: 'LINE configuration is not set.' }, { status: 500 })
  }

  const { projectId, projectIds } = await request.json().catch(() => ({}))
  const requestedProjectIds = Array.isArray(projectIds) ? projectIds.filter((id): id is string => typeof id === 'string') : projectId ? [projectId] : []
  const selectedProjects = await getActiveProjectsWithTasks(requestedProjectIds)
  if (!selectedProjects.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const messages: { type: 'text'; text: string }[] = []
  for (const { project, tasks, ownerNames } of selectedProjects) {
    const intelligence = getProjectIntelligence(project, tasks)
    const followUps = intelligence.wbsFollowUpTasks.slice(0, 3)
    const aiSummary = await buildAiProjectSummary(project, tasks, ownerNames)

    messages.push({
      type: 'text' as const,
      text: [
        `📊 AI Project Analysis — ${project.name}`,
        `วันที่ ${date}`,
        '',
        ...formatIntelligenceLines(project, intelligence, ownerNames),
        '',
        ...buildWbsTaskLines(tasks, ownerNames),
        '',
        followUps.length ? 'งานที่ควรติดตาม:' : 'สถานะการติดตาม:',
        ...(followUps.length ? followUps.map(task => `• ${task.title} — Owner: ${ownerNames[task.ownerId] ?? task.ownerId}${task.dueDate ? `, due ${task.dueDate}` : ''}${task.blocker ? `, blocker: ${task.blocker}` : ''}`) : ['• ไม่มีงานใกล้กำหนดหรือมี Blocker ในขณะนี้']),
        '',
        '🤖 AI Summary:',
        ...aiSummary.map(item => `• ${item}`),
      ].join('\n'),
    })
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: config.recipientId, messages }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true, projectIds: selectedProjects.map(({ project }) => project.id), messages: messages.map(message => message.text) })
}
