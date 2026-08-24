import { getProjectTimeline } from '@/lib/projectTimeline'
import type { Project, Task, TaskPriority } from '@/types'

const priorityHours: Record<TaskPriority, number> = { CRITICAL: 16, HIGH: 12, MEDIUM: 8, LOW: 4 }
const activeStatuses = new Set(['TODO', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED'])

export interface ProjectIntelligence {
  progress: number
  done: number
  inProgress: number
  atRisk: number
  blocked: number
  todo: number
  scheduleProgress: number
  scheduleDelta: number
  remainingWorkingDays: number
  scheduleStatus: string
  attentionTasks: Task[]
  upcomingMilestones: { title: string; date: string; status: string }[]
  overdueMilestones: { title: string; date: string; status: string }[]
  workloadAlerts: { ownerId: string; dailyHours: number; capacityPercent: number }[]
}

export function getProjectIntelligence(project: Project, tasks: Task[], now = new Date()): ProjectIntelligence {
  const count = (status: string) => tasks.filter(task => task.status === status).length
  const metricTotal = project.metrics?.reduce((total, metric) => total + metric.total, 0) ?? 0
  const metricCompleted = project.metrics?.reduce((total, metric) => total + metric.completed, 0) ?? 0
  const progress = metricTotal ? Number(((metricCompleted / metricTotal) * 100).toFixed(2)) : tasks.length ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length) : 0
  const timeline = getProjectTimeline(project, now)
  const scheduleDelta = Number((progress - timeline.scheduleProgress).toFixed(2))
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in14Days = new Date(today); in14Days.setDate(today.getDate() + 14)
  const milestones = project.milestones ?? []
  const overdueMilestones = milestones.filter(item => item.status !== 'COMPLETED' && new Date(`${item.date}T00:00:00`) < today)
  const upcomingMilestones = milestones.filter(item => { const date = new Date(`${item.date}T00:00:00`); return item.status !== 'COMPLETED' && date >= today && date <= in14Days })
  const ownerDailyHours = new Map<string, number>()
  tasks.filter(task => activeStatuses.has(task.status)).forEach(task => {
    const durationMs = task.plannedStartDate && task.plannedEndDate ? Math.max(1, Math.round((new Date(`${task.plannedEndDate}T00:00:00`).getTime() - new Date(`${task.plannedStartDate}T00:00:00`).getTime()) / 86400000) + 1) : 5
    const hours = task.estimatedHours ?? priorityHours[task.priority]
    const owners = task.assigneeIds?.length ? task.assigneeIds : [task.ownerId]
    owners.forEach(ownerId => ownerDailyHours.set(ownerId, (ownerDailyHours.get(ownerId) ?? 0) + hours / durationMs))
  })
  const workloadAlerts = [...ownerDailyHours.entries()].filter(([, dailyHours]) => dailyHours >= 6.4).map(([ownerId, dailyHours]) => ({ ownerId, dailyHours, capacityPercent: Math.round((dailyHours / 8) * 100) })).sort((a, b) => b.capacityPercent - a.capacityPercent)
  const scheduleStatus = timeline.isOverdue ? 'Overdue' : scheduleDelta < -5 ? `Behind schedule by ${Math.abs(scheduleDelta)}%` : scheduleDelta > 5 ? `Ahead of schedule by ${scheduleDelta}%` : 'On schedule'
  return { progress, done:count('DONE'), inProgress:count('IN_PROGRESS'), atRisk:count('AT_RISK'), blocked:count('BLOCKED'), todo:count('TODO'), scheduleProgress:timeline.scheduleProgress, scheduleDelta, remainingWorkingDays:timeline.remainingWorkingDays, scheduleStatus, attentionTasks:tasks.filter(task => task.status === 'BLOCKED' || task.status === 'AT_RISK'), upcomingMilestones, overdueMilestones, workloadAlerts }
}

export function formatIntelligenceLines(project: Project, intelligence: ProjectIntelligence) {
  return [
    `Work progress: ${intelligence.progress}% | Schedule: ${intelligence.scheduleProgress}%`,
    `Schedule status: ${intelligence.scheduleStatus} | Remaining: ${intelligence.remainingWorkingDays} working days`,
    `✅ Done: ${intelligence.done} | 🔵 In progress: ${intelligence.inProgress} | ⚠️ At risk: ${intelligence.atRisk} | 🔴 Blocked: ${intelligence.blocked} | ⏳ To do: ${intelligence.todo}`,
    ...(intelligence.overdueMilestones.length ? [`🚨 Overdue milestones: ${intelligence.overdueMilestones.slice(0, 2).map(item => `${item.title} (${item.date})`).join(', ')}`] : []),
    ...(intelligence.upcomingMilestones.length ? [`📍 Upcoming milestones: ${intelligence.upcomingMilestones.slice(0, 2).map(item => `${item.title} (${item.date})`).join(', ')}`] : []),
    ...(intelligence.workloadAlerts.length ? [`👥 Capacity alerts: ${intelligence.workloadAlerts.slice(0, 2).map(item => `${item.ownerId} ${item.capacityPercent}% (${item.dailyHours.toFixed(1)}h/day)`).join(', ')}`] : []),
  ]
}
