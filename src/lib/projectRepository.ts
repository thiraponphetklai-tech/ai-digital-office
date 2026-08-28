import { db } from '@/lib/db'
import { mapProject, mapTask } from '@/lib/databaseMappers'

const projectInclude = {
  calendar: { include: { holidays: true } }, metrics: true, milestones: true, members: true, resources: true,
} as const
const taskInclude = { assignees: true, dependencies: true } as const

export async function getProjectWithTasks(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, include: projectInclude })
  if (!project) return null
  const tasks = await db.task.findMany({ where: { projectId }, include: taskInclude, orderBy: { dueDate: 'asc' } })
  return { project: mapProject(project), tasks: tasks.map(mapTask) }
}

export async function getActiveProjectsWithTasks(projectIds?: string[]) {
  const projects = await db.project.findMany({ where: projectIds?.length ? { id: { in: projectIds } } : { status: 'ACTIVE' }, include: projectInclude, orderBy: { name: 'asc' } })
  return Promise.all(projects.map(async (project: { id: string } & Parameters<typeof mapProject>[0]) => ({ project: mapProject(project), tasks: (await db.task.findMany({ where: { projectId: project.id }, include: taskInclude, orderBy: { dueDate: 'asc' } })).map(mapTask) })))
}
