import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapTask } from '@/lib/databaseMappers'
import { canAccessProject, getCurrentUser } from '@/lib/localAuth'
import { sendTaskAssignmentNotification } from '@/lib/lineTaskNotifications'

const include = { assignees: true, dependencies: true } as const

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const tasks = await db.task.findMany({ where: { projectId }, include, orderBy: [{ dueDate: 'asc' }, { title: 'asc' }] })
  return NextResponse.json(tasks.map(mapTask))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  if (!body.id || !body.title || !body.ownerId || !body.teamId) return NextResponse.json({ error: 'id, title, ownerId, and teamId are required' }, { status: 400 })
  const task = await db.task.create({
    data: {
      id: body.id, projectId, title: body.title, description: body.description, ownerId: body.ownerId, makerId: body.makerId || undefined, checkerId: body.checkerId || undefined, teamId: body.teamId,
      status: body.status ?? 'TODO', priority: body.priority ?? 'MEDIUM', riskLevel: body.riskLevel ?? 'NONE', progress: body.progress ?? 0,
      startDate: body.startDate ? new Date(body.startDate) : undefined, plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : undefined,
      plannedEndDate: body.plannedEndDate ? new Date(body.plannedEndDate) : undefined, dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      estimatedHours: body.estimatedHours, actualHours: body.actualHours, blocker: body.blocker,
      assignees: body.assigneeIds?.length ? { create: body.assigneeIds.map((resourceId: string) => ({ resourceId })) } : undefined,
    }, include,
  })
  const assigneeIds = [...new Set([task.ownerId, ...task.assignees.map((assignee: { resourceId: string }) => assignee.resourceId)])]
  const [project, resources] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    db.resource.findMany({ where: { id: { in: assigneeIds }, active: true }, select: { name: true } }),
  ])
  const delivered = await sendTaskAssignmentNotification({ projectName: project?.name ?? 'Digital Office', taskTitle: task.title, dueDate: task.dueDate, ownerNames: resources.map((resource: { name: string }) => resource.name), appUrl: process.env.APP_BASE_URL?.replace(/\/$/, '') })
  if (delivered) await db.projectEvent.create({ data: { projectId, taskId: task.id, type: 'line.task_assignment_sent', message: `LINE assignment notice sent for ${task.title}`, color: '#06C755', payload: { assigneeCount: resources.length } } })
  return NextResponse.json(mapTask(task), { status: 201 })
}
