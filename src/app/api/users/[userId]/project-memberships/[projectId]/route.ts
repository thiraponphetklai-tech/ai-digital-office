import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSystemAdmin } from '@/lib/localAuth'

const projectRoles = new Set(['PROJECT_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'CONTRIBUTOR', 'VIEWER'])

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string; projectId: string }> }) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, projectId } = await params
  const body = await request.json().catch(() => ({})) as { role?: unknown }
  if (typeof body.role !== 'string' || !projectRoles.has(body.role)) return NextResponse.json({ error: 'A valid project role is required.' }, { status: 400 })
  const membership = await db.projectUserMember.upsert({ where: { projectId_userId: { projectId, userId } }, create: { projectId, userId, role: body.role as 'PROJECT_ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'CONTRIBUTOR' | 'VIEWER' }, update: { role: body.role as 'PROJECT_ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'CONTRIBUTOR' | 'VIEWER', expiresAt: null } }).catch(() => null)
  return membership ? NextResponse.json({ projectId: membership.projectId, userId: membership.userId, role: membership.role }) : NextResponse.json({ error: 'User or project not found.' }, { status: 404 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ userId: string; projectId: string }> }) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, projectId } = await params
  const membership = await db.projectUserMember.delete({ where: { projectId_userId: { projectId, userId } } }).catch(() => null)
  return membership ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: 'Membership not found.' }, { status: 404 })
}
