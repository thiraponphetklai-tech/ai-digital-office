import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapProject } from '@/lib/databaseMappers'
import { getCurrentUser } from '@/lib/localAuth'

const include = { calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true } as const

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
  const body = await request.json()
  if (!body.id || !body.name || !body.startDate || !body.targetDate) return NextResponse.json({ error: 'id, name, startDate, and targetDate are required' }, { status: 400 })
  const project = await db.$transaction((transaction: Prisma.TransactionClient) => transaction.project.create({
    data: { id: body.id, name: body.name, code: body.code, description: body.description, startDate: new Date(body.startDate), targetDate: new Date(body.targetDate), status: body.status ?? 'ACTIVE', userMembers: { create: { userId: user.id, role: 'PROJECT_ADMIN' } } },
    include,
  }))
  return NextResponse.json(mapProject(project), { status: 201 })
}
