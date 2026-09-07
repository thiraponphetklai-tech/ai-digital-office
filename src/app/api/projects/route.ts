import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapProject } from '@/lib/databaseMappers'
import { getCurrentUser } from '@/lib/localAuth'

const include = { calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true } as const
const isValidDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isGlobalUser = user.systemRole === 'SYSTEM_ADMIN' || user.systemRole === 'PORTFOLIO_MANAGER'
  const projects = await db.project.findMany({
    where: isGlobalUser ? undefined : { userMembers: { some: { userId: user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
    include,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(projects.map(mapProject))
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.systemRole === 'EXTERNAL_USER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.id !== 'string' || typeof body.name !== 'string' || typeof body.startDate !== 'string' || typeof body.targetDate !== 'string') return NextResponse.json({ error: 'id, name, startDate, and targetDate are required' }, { status: 400 })
  if (!body.name.trim() || !isValidDate(body.startDate) || !isValidDate(body.targetDate) || body.targetDate < body.startDate) return NextResponse.json({ error: 'Project name and valid dates are required.' }, { status: 400 })
  const projectId = body.id
  const projectName = body.name.trim()
  const projectStartDate = body.startDate
  const projectTargetDate = body.targetDate
  const validPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 12).filter((task: unknown): task is Record<string, unknown> => typeof task === 'object' && task !== null).map(task => ({
    id: typeof task.id === 'string' ? task.id : `task-${crypto.randomUUID()}`,
    title: typeof task.title === 'string' ? task.title.trim().slice(0, 180) : '',
    description: typeof task.description === 'string' ? task.description.trim().slice(0, 1000) : null,
    ownerId: typeof task.ownerId === 'string' ? task.ownerId : '',
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
    priority: typeof task.priority === 'string' && validPriorities.has(task.priority) ? task.priority : 'MEDIUM',
  })).filter(task => task.title && task.ownerId && isValidDate(task.dueDate) && task.dueDate <= projectTargetDate) : []
  if (Array.isArray(body.tasks) && !tasks.length) return NextResponse.json({ error: 'At least one valid task is required.' }, { status: 400 })
  const ownerIds = [...new Set(tasks.map(task => task.ownerId))]
  if (ownerIds.length && await db.resource.count({ where: { id: { in: ownerIds }, active: true } }) !== ownerIds.length) return NextResponse.json({ error: 'A selected task owner is invalid.' }, { status: 400 })
  const isAiDraft = body.aiGenerated === true
  const auditId = typeof body.aiDraftAuditId === 'string' ? body.aiDraftAuditId : ''
  if (isAiDraft && !auditId) return NextResponse.json({ error: 'An AI draft audit is required.' }, { status: 400 })
  try {
  const project = await db.$transaction(async (transaction: Prisma.TransactionClient) => {
    if (isAiDraft) {
      const audit = await transaction.aiProjectDraftAudit.findFirst({ where: { id: auditId, userId: user.id, confirmedAt: null }, select: { id: true } })
      if (!audit) throw new Error('AI draft is unavailable or has already been confirmed.')
    }
    const created = await transaction.project.create({
      data: { id: projectId, name: projectName, code: typeof body.code === 'string' ? body.code : undefined, description: typeof body.description === 'string' ? body.description : undefined, startDate: new Date(projectStartDate), targetDate: new Date(projectTargetDate), status: body.status === 'ON_HOLD' || body.status === 'COMPLETED' ? body.status : 'ACTIVE', userMembers: { create: { userId: user.id, role: 'PROJECT_ADMIN' } }, tasks: { create: tasks.map(({ ownerId, ...task }) => ({ ...task, teamId: 'general', status: 'TODO', progress: 0, owner: { connect: { id: ownerId } }, assignees: { create: { resourceId: ownerId } } })) }, events: { create: isAiDraft ? { type: 'ai.project_draft_confirmed', message: `AI draft confirmed by ${user.displayName}`, color: '#7C3AED', payload: { taskCount: tasks.length, source: 'project-draft', auditId } } : undefined } },
      include,
    })
    if (isAiDraft) await transaction.aiProjectDraftAudit.update({ where: { id: auditId }, data: { confirmedProjectId: created.id, confirmedDraft: { name: created.name, code: created.code, description: created.description, targetDate: projectTargetDate, tasks }, confirmedAt: new Date() } })
    return created
  })
  return NextResponse.json(mapProject(project), { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('AI draft')) return NextResponse.json({ error: error.message }, { status: 400 })
    throw error
  }
}
