import { NextRequest, NextResponse } from 'next/server'
import { getProjectWithTasks } from '@/lib/projectRepository'
import { getLineDeliveryConfig } from '@/lib/lineConfig'
import { buildManualProjectUpdateText } from '@/lib/lineReport'

export async function POST(request: NextRequest) {
  const { projectId } = await request.json().catch(() => ({}))
  if (typeof projectId !== 'string') return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  const projectData = await getProjectWithTasks(projectId)
  if (!projectData) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const { project, tasks } = projectData

  const config = await getLineDeliveryConfig()
  if (!config) {
    return NextResponse.json({ error: 'LINE configuration is not set.' }, { status: 500 })
  }

  const text = buildManualProjectUpdateText(project, tasks)

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: config.recipientId, messages: [{ type: 'text', text }] }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true, projectId: project.id })
}
