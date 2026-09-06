import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapTask } from '@/lib/databaseMappers'
import { canAccessProject, getCurrentUser } from '@/lib/localAuth'

const include = { assignees: true, dependencies: true } as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  const existingTask = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
  if (!user || !existingTask || !await canAccessProject(user, existingTask.projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const task = await db.$transaction(async (transaction: Prisma.TransactionClient) => {
    if (Array.isArray(body.assigneeIds)) await transaction.taskAssignee.deleteMany({ where: { taskId } })
    return transaction.task.update({
      where: { id: taskId },
      data: {
        title: body.title, description: body.description, ownerId: body.ownerId, makerId: body.makerId === undefined ? undefined : body.makerId || null, checkerId: body.checkerId === undefined ? undefined : body.checkerId || null, teamId: body.teamId, status: body.status, priority: body.priority,
        riskLevel: body.riskLevel, progress: body.progress, blocker: body.blocker, estimatedHours: body.estimatedHours, actualHours: body.actualHours,
        startDate: body.startDate === undefined ? undefined : body.startDate ? new Date(body.startDate) : null,
        plannedStartDate: body.plannedStartDate === undefined ? undefined : body.plannedStartDate ? new Date(body.plannedStartDate) : null,
        plannedEndDate: body.plannedEndDate === undefined ? undefined : body.plannedEndDate ? new Date(body.plannedEndDate) : null,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        assignees: Array.isArray(body.assigneeIds) ? { create: body.assigneeIds.map((resourceId: string) => ({ resourceId })) } : undefined,
      }, include,
    })
  }).catch(() => null)
  return task ? NextResponse.json(mapTask(task)) : NextResponse.json({ error: 'Task not found or update failed' }, { status: 404 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  const existingTask = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
  if (!user || !existingTask || !await canAccessProject(user, existingTask.projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const task = await db.task.delete({ where: { id: taskId }, select: { id: true } }).catch(() => null)
  return task ? NextResponse.json({ deleted: true, taskId: task.id }) : NextResponse.json({ error: 'Task not found or delete failed' }, { status: 404 })
}
