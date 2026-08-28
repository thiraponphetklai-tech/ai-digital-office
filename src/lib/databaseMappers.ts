import type { Project, Resource, Task } from '@/types'

const isoDate = (value: Date | null | undefined) => value?.toISOString().slice(0, 10)

type DbProject = {
  id: string; name: string; code: string | null; description: string | null; startDate: Date; targetDate: Date; status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  calendar: { workingDays: number[]; holidays: { date: Date; name: string }[] } | null
  metrics: { label: string; completed: number; total: number; unit: string | null; detail: string | null }[]
  milestones: { id: string; title: string; date: Date; status: 'UPCOMING' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED'; owner: string | null; description: string | null }[]
  members: { resourceId: string }[]; resources: { resourceId: string }[]
}

type DbTask = {
  id: string; projectId: string; title: string; description: string | null; ownerId: string; teamId: string; status: Task['status']; priority: Task['priority']; progress: { toNumber(): number }; riskLevel: Task['riskLevel']; startDate: Date | null; plannedStartDate: Date | null; plannedEndDate: Date | null; estimatedHours: { toNumber(): number } | null; actualHours: { toNumber(): number } | null; dueDate: Date | null; blocker: string | null; completedAt: Date | null; updatedAt: Date; aiSummary: string | null; aiRiskAssessment: string | null
  assignees: { resourceId: string }[]; dependencies: { dependsOnTaskId: string }[]
}

export function mapProject(project: DbProject): Project {
  return {
    id: project.id, name: project.name, code: project.code ?? undefined, description: project.description ?? undefined,
    startDate: isoDate(project.startDate)!, targetDate: isoDate(project.targetDate)!, status: project.status,
    teamIds: [], memberIds: project.members.map(item => item.resourceId), resourceIds: project.resources.map(item => item.resourceId),
    metrics: project.metrics.map(metric => ({ label: metric.label, completed: metric.completed, total: metric.total, unit: metric.unit ?? undefined, detail: metric.detail ?? undefined })),
    calendar: project.calendar ? { workingDays: project.calendar.workingDays, holidays: project.calendar.holidays.map(holiday => ({ date: isoDate(holiday.date)!, name: holiday.name })) } : undefined,
    milestones: project.milestones.map(milestone => ({ id: milestone.id, title: milestone.title, date: isoDate(milestone.date)!, status: milestone.status, owner: milestone.owner ?? undefined, description: milestone.description ?? undefined })),
  }
}

export function mapTask(task: DbTask): Task {
  return {
    id: task.id, projectId: task.projectId, title: task.title, description: task.description ?? undefined, ownerId: task.ownerId, teamId: task.teamId,
    status: task.status, priority: task.priority, progress: task.progress.toNumber(), riskLevel: task.riskLevel,
    startDate: isoDate(task.startDate), plannedStartDate: isoDate(task.plannedStartDate), plannedEndDate: isoDate(task.plannedEndDate), dueDate: isoDate(task.dueDate),
    estimatedHours: task.estimatedHours?.toNumber(), actualHours: task.actualHours?.toNumber(), blocker: task.blocker ?? undefined,
    completedAt: task.completedAt?.toISOString(), lastUpdatedAt: task.updatedAt.toISOString(), aiSummary: task.aiSummary ?? undefined, aiRiskAssessment: task.aiRiskAssessment ?? undefined,
    assigneeIds: task.assignees.map(item => item.resourceId), dependency: task.dependencies.map(item => item.dependsOnTaskId),
  }
}

export function mapResource(resource: { id: string; name: string; type: Resource['type']; role: string; company: string | null; skills: string[]; capacityHoursPerDay: { toNumber(): number }; active: boolean }): Resource {
  return { id: resource.id, name: resource.name, type: resource.type, role: resource.role, company: resource.company ?? undefined, skills: resource.skills, capacityHoursPerDay: resource.capacityHoursPerDay.toNumber(), active: resource.active }
}
