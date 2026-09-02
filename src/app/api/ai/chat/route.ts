import { NextRequest, NextResponse } from 'next/server'
import { createFoundryResponse, FoundryConfigurationError } from '@/lib/foundryClient'
import { getProjectWithTasks } from '@/lib/projectRepository'
import { formatIntelligenceLines, getProjectIntelligence } from '@/lib/projectIntelligence'
import type { Task } from '@/types'

export const runtime = 'nodejs'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

function isChatTurn(value: unknown): value is ChatTurn {
  return typeof value === 'object' && value !== null &&
    ((value as ChatTurn).role === 'user' || (value as ChatTurn).role === 'assistant') &&
    typeof (value as ChatTurn).content === 'string'
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { projectId?: unknown; message?: unknown; history?: unknown } | null
  if (!body || typeof body.projectId !== 'string' || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'projectId and message are required.' }, { status: 400 })
  }

  const projectData = await getProjectWithTasks(body.projectId)
  if (!projectData) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const { project, tasks } = projectData
  const intelligence = getProjectIntelligence(project, tasks)
  const taskContext = tasks.slice(0, 100).map((task: Task) => [
    `id=${task.id}`, `title=${task.title}`, `status=${task.status}`, `progress=${task.progress}%`,
    `owner=${task.ownerId}`, `priority=${task.priority}`, task.dueDate ? `due=${task.dueDate}` : '',
    task.blocker ? `blocker=${task.blocker}` : '', task.description ? `description=${task.description}` : '',
  ].filter(Boolean).join(' | ')).join('\n')
  const history = Array.isArray(body.history) ? body.history.filter(isChatTurn).slice(-16).map(turn => ({ role: turn.role, content: turn.content.slice(0, 3000) })) : []

  const systemPrompt = [
    'You are Digital Office AI, a pragmatic Thai/English project-management assistant.',
    'Answer using only the project context supplied below. If the information is absent, say that you do not have it; do not invent task updates, owners, dates, or outcomes.',
    'Respond in the user language. Keep the answer concise and actionable. Use bullets for plans or risks.',
    'Use the conversation history to resolve follow-up references such as "that task", "it", "the owner", or "as discussed". Do not ignore relevant prior turns.',
    'You are advisory only: do not claim that you sent messages, changed tasks, or created records.',
    '',
    `PROJECT: ${project.name} (${project.code ?? project.id})`,
    `DESCRIPTION: ${project.description ?? 'Not provided'}`,
    'PROJECT INTELLIGENCE:',
    ...formatIntelligenceLines(project, intelligence),
    '',
    'TASKS:',
    taskContext || 'No tasks recorded.',
  ].join('\n')

  try {
    const answer = await createFoundryResponse([
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: body.message.trim().slice(0, 4000) },
    ])
    return NextResponse.json({ answer, provider: 'microsoft-foundry', deployment: process.env.FOUNDRY_MODEL_DEPLOYMENT ?? 'gpt-5.6-luna' })
  } catch (error) {
    console.error('Microsoft Foundry chat request failed', error)
    const message = error instanceof FoundryConfigurationError
      ? 'AI identity is not configured.'
      : 'AI assistant is temporarily unavailable.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
