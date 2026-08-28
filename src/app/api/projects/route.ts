import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapProject } from '@/lib/databaseMappers'

const include = { calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true } as const

export async function GET() {
  const projects = await db.project.findMany({ include, orderBy: { name: 'asc' } })
  return NextResponse.json(projects.map(mapProject))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body.id || !body.name || !body.startDate || !body.targetDate) return NextResponse.json({ error: 'id, name, startDate, and targetDate are required' }, { status: 400 })
  const project = await db.project.create({
    data: { id: body.id, name: body.name, code: body.code, description: body.description, startDate: new Date(body.startDate), targetDate: new Date(body.targetDate), status: body.status ?? 'ACTIVE' },
    include,
  })
  return NextResponse.json(mapProject(project), { status: 201 })
}
