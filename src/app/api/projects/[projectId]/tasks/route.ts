import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapTask } from '@/lib/databaseMappers'

const include = { assignees: true, dependencies: true } as const

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const tasks = await db.task.findMany({ where: { projectId }, include, orderBy: [{ dueDate: 'asc' }, { title: 'asc' }] })
  return NextResponse.json(tasks.map(mapTask))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
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
  return NextResponse.json(mapTask(task), { status: 201 })
}
