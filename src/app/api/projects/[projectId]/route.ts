import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapProject } from '@/lib/databaseMappers'

const include = { calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true } as const

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await db.project.findUnique({ where: { id: projectId }, include })
  return project ? NextResponse.json(mapProject(project)) : NextResponse.json({ error: 'Project not found' }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const body = await request.json()
  const project = await db.project.update({
    where: { id: projectId },
    data: { name: body.name, code: body.code, description: body.description, status: body.status, startDate: body.startDate ? new Date(body.startDate) : undefined, targetDate: body.targetDate ? new Date(body.targetDate) : undefined },
    include,
  }).catch(() => null)
  return project ? NextResponse.json(mapProject(project)) : NextResponse.json({ error: 'Project not found' }, { status: 404 })
}
