import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapResource } from '@/lib/databaseMappers'

export async function GET() {
  const resources = await db.resource.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(resources.map(mapResource))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body.id || !body.name || !body.role) return NextResponse.json({ error: 'id, name, and role are required' }, { status: 400 })
  const resource = await db.resource.create({
    data: { id: body.id, name: body.name, role: body.role, type: body.type ?? 'EMPLOYEE', company: body.company, skills: body.skills ?? [], capacityHoursPerDay: body.capacityHoursPerDay ?? 8, active: body.active ?? true },
  })
  return NextResponse.json(mapResource(resource), { status: 201 })
}
