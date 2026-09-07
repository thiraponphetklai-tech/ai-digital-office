import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapResource } from '@/lib/databaseMappers'
import { canAccessProject, getCurrentUser } from '@/lib/localAuth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const user = await getCurrentUser()
  if (!user || !await canAccessProject(user, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const project = await db.project.findUnique({ where: { id: projectId }, include: { resources: { include: { resource: true } } } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  return NextResponse.json(project.resources.map(item => mapResource(item.resource)).filter(resource => resource.active))
}
