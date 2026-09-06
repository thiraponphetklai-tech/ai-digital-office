import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapProject } from '@/lib/databaseMappers'
import { canAccessProject, getCurrentUser } from '@/lib/localAuth'

const include = { calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true } as const

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const project = await db.project.findUnique({ where: { id: projectId }, include })
  return project ? NextResponse.json(mapProject(project)) : NextResponse.json({ error: 'Project not found' }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const project = await db.$transaction(async (transaction: Prisma.TransactionClient) => {
    if (body.calendar) {
      await transaction.projectCalendar.upsert({
        where: { projectId },
        create: { projectId, workingDays: body.calendar.workingDays ?? [1, 2, 3, 4, 5] },
        update: { workingDays: body.calendar.workingDays ?? [1, 2, 3, 4, 5] },
      })
      const calendar = await transaction.projectCalendar.findUniqueOrThrow({ where: { projectId } })
      await transaction.projectHoliday.deleteMany({ where: { calendarId: calendar.id } })
      if (Array.isArray(body.calendar.holidays) && body.calendar.holidays.length) {
        await transaction.projectHoliday.createMany({ data: body.calendar.holidays.map((holiday: { date: string; name: string }) => ({ calendarId: calendar.id, date: new Date(holiday.date), name: holiday.name })) })
      }
    }
    if (Array.isArray(body.metrics)) {
      const metrics = body.metrics
        .filter((metric: { label?: unknown }) => typeof metric.label === 'string' && metric.label.trim())
        .map((metric: { label: string; completed?: unknown; total?: unknown; unit?: unknown; detail?: unknown }) => ({
          projectId,
          label: metric.label.trim(),
          completed: Math.max(0, Number(metric.completed) || 0),
          total: Math.max(0, Number(metric.total) || 0),
          unit: typeof metric.unit === 'string' && metric.unit.trim() ? metric.unit.trim() : null,
          detail: typeof metric.detail === 'string' && metric.detail.trim() ? metric.detail.trim() : null,
        }))
      await transaction.projectMetric.deleteMany({ where: { projectId, label: { notIn: metrics.map((metric: { label: string }) => metric.label) } } })
      for (const metric of metrics) {
        await transaction.projectMetric.upsert({
          where: { projectId_label: { projectId, label: metric.label } },
          create: metric,
          update: { completed: metric.completed, total: metric.total, unit: metric.unit, detail: metric.detail },
        })
      }
    }
    if (Array.isArray(body.milestones)) {
      await transaction.milestone.deleteMany({ where: { projectId } })
      if (body.milestones.length) {
        await transaction.milestone.createMany({ data: body.milestones.map((milestone: { id: string; title: string; date: string; status: 'UPCOMING' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED'; owner?: string; description?: string }) => ({ id: milestone.id, projectId, title: milestone.title, date: new Date(milestone.date), status: milestone.status, owner: milestone.owner, description: milestone.description })) })
      }
    }
    return transaction.project.update({
      where: { id: projectId },
      data: { name: body.name, code: body.code, description: body.description, status: body.status, startDate: body.startDate ? new Date(body.startDate) : undefined, targetDate: body.targetDate ? new Date(body.targetDate) : undefined },
      include,
    })
  }).catch(() => null)
  return project ? NextResponse.json(mapProject(project)) : NextResponse.json({ error: 'Project not found or update failed' }, { status: 404 })
}
