import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapResource } from '@/lib/databaseMappers'
import { canAccessProject, getCurrentUser } from '@/lib/localAuth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // Backfill memberships created before users were automatically linked to a Resource.
  // Task ownership uses Resource IDs, so this is required for every project member.
  const project = await db.$transaction(async transaction => {
    const current = await transaction.project.findUnique({ where: { id: projectId }, include: { userMembers: { include: { user: { select: { id: true, displayName: true, resourceId: true } } } } } })
    if (!current) return null
    for (const membership of current.userMembers) {
      const member = membership.user
      const resourceId = member.resourceId ?? `resource-${member.id}`
      if (!member.resourceId) {
        await transaction.resource.upsert({ where: { id: resourceId }, create: { id: resourceId, name: member.displayName, role: 'Project member', skills: [], capacityHoursPerDay: 8, active: true }, update: {} })
        await transaction.user.update({ where: { id: member.id }, data: { resourceId } })
      }
      await transaction.projectResource.upsert({ where: { projectId_resourceId: { projectId, resourceId } }, create: { projectId, resourceId }, update: {} })
    }
    return transaction.project.findUnique({ where: { id: projectId }, include: { resources: { include: { resource: true } } } })
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  return NextResponse.json(project.resources.map(item => mapResource(item.resource)).filter(resource => resource.active))
}
