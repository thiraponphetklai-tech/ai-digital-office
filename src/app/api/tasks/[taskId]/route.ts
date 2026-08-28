import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapTask } from '@/lib/databaseMappers'

const include = { assignees: true, dependencies: true } as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const body = await request.json()
  const task = await db.$transaction(async (transaction: Prisma.TransactionClient) => {
    if (Array.isArray(body.assigneeIds)) await transaction.taskAssignee.deleteMany({ where: { taskId } })
    return transaction.task.update({
      where: { id: taskId },
      data: {
        title: body.title, description: body.description, ownerId: body.ownerId, teamId: body.teamId, status: body.status, priority: body.priority,
        riskLevel: body.riskLevel, progress: body.progress, blocker: body.blocker, estimatedHours: body.estimatedHours, actualHours: body.actualHours,
        startDate: body.startDate ? new Date(body.startDate) : undefined, plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : undefined,
        plannedEndDate: body.plannedEndDate ? new Date(body.plannedEndDate) : undefined, dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        assignees: Array.isArray(body.assigneeIds) ? { create: body.assigneeIds.map((resourceId: string) => ({ resourceId })) } : undefined,
      }, include,
    })
  }).catch(() => null)
  return task ? NextResponse.json(mapTask(task)) : NextResponse.json({ error: 'Task not found or update failed' }, { status: 404 })
}
