import { NextRequest, NextResponse } from 'next/server'
import { requireSystemAdmin } from '@/lib/localAuth'
import { getProjectWithTasks } from '@/lib/projectRepository'
import { buildManualProjectUpdateText } from '@/lib/lineReport'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId is required.' }, { status: 400 })
  const projectData = await getProjectWithTasks(projectId)
  if (!projectData) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  return NextResponse.json({ projectName: projectData.project.name, text: buildManualProjectUpdateText(projectData.project, projectData.tasks, projectData.ownerNames) })
}
