import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSystemAdmin } from '@/lib/localAuth'

const projectRoles = new Set(['PROJECT_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'CONTRIBUTOR', 'VIEWER'])

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string; projectId: string }> }) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, projectId } = await params
  const body = await request.json().catch(() => ({})) as { role?: unknown }
  if (typeof body.role !== 'string' || !projectRoles.has(body.role)) return NextResponse.json({ error: 'A valid project role is required.' }, { status: 400 })
  const membership = await db.$transaction(async transaction => {
    const user = await transaction.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, resourceId: true } })
    const project = await transaction.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!user || !project) return null
    const resourceId = user.resourceId ?? `resource-${user.id}`
    if (!user.resourceId) {
      await transaction.resource.create({ data: { id: resourceId, name: user.displayName, role: 'Project member', skills: [], capacityHoursPerDay: 8, active: true } })
      await transaction.user.update({ where: { id: user.id }, data: { resourceId } })
    }
    await transaction.projectResource.upsert({ where: { projectId_resourceId: { projectId, resourceId } }, create: { projectId, resourceId }, update: {} })
    const member = await transaction.projectUserMember.upsert({ where: { projectId_userId: { projectId, userId } }, create: { projectId, userId, role: body.role as 'PROJECT_ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'CONTRIBUTOR' | 'VIEWER' }, update: { role: body.role as 'PROJECT_ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'CONTRIBUTOR' | 'VIEWER', expiresAt: null } })
    return { ...member, resourceId }
  }).catch(() => null)
  return membership ? NextResponse.json({ projectId: membership.projectId, userId: membership.userId, role: membership.role, resourceId: membership.resourceId }) : NextResponse.json({ error: 'User or project not found.' }, { status: 404 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ userId: string; projectId: string }> }) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, projectId } = await params
  const membership = await db.projectUserMember.delete({ where: { projectId_userId: { projectId, userId } } }).catch(() => null)
  return membership ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: 'Membership not found.' }, { status: 404 })
}
