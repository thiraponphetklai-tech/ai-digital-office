
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
  upcomingPlannedTasks: { title: string; date: string; assigneeIds: string[] }[]
  workloadAlerts: { ownerId: string; dailyHours: number; capacityPercent: number }[]
}

export function getProjectIntelligence(project: Project, tasks: Task[], now = new Date()): ProjectIntelligence {
  const count = (status: string) => tasks.filter(task => task.status === status).length
  const metricTotal = project.metrics?.reduce((total, metric) => total + metric.total, 0) ?? 0
  const metricCompleted = project.metrics?.reduce((total, metric) => total + metric.completed, 0) ?? 0
  // WBS is the source of truth for project completion; metrics are operational KPIs shown separately.
  const progress = tasks.length ? Number((tasks.reduce((total, task) => total + task.progress, 0) / tasks.length).toFixed(2)) : metricTotal ? Number(((metricCompleted / metricTotal) * 100).toFixed(2)) : 0
  const timeline = getProjectTimeline(project, now)
  const scheduleDelta = Number((progress - timeline.scheduleProgress).toFixed(2))
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in14Days = new Date(today); in14Days.setDate(today.getDate() + 14)
  const milestones = project.milestones ?? []
  const overdueMilestones = milestones.filter(item => item.status !== 'COMPLETED' && new Date(`${item.date}T00:00:00`) < today)
  const upcomingMilestones = milestones.filter(item => { const date = new Date(`${item.date}T00:00:00`); return item.status !== 'COMPLETED' && date >= today && date <= in14Days })
  const upcomingPlannedTasks = tasks.filter(task => {
    if (!task.plannedStartDate || task.status === 'DONE') return false
    const date = new Date(`${task.plannedStartDate}T00:00:00`)
    return date >= today && date <= in14Days
  }).map(task => ({ title: task.title, date: task.plannedStartDate!, assigneeIds: task.assigneeIds?.length ? task.assigneeIds : [task.ownerId] }))
  const ownerDailyHours = new Map<string, number>()
  tasks.filter(task => activeStatuses.has(task.status)).forEach(task => {
    const durationMs = task.plannedStartDate && task.plannedEndDate ? Math.max(1, Math.round((new Date(`${task.plannedEndDate}T00:00:00`).getTime() - new Date(`${task.plannedStartDate}T00:00:00`).getTime()) / 86400000) + 1) : 5
    const hours = task.estimatedHours ?? priorityHours[task.priority]
    const owners = task.assigneeIds?.length ? task.assigneeIds : [task.ownerId]
    owners.forEach(ownerId => ownerDailyHours.set(ownerId, (ownerDailyHours.get(ownerId) ?? 0) + hours / durationMs))
  })
  const workloadAlerts = [...ownerDailyHours.entries()].filter(([, dailyHours]) => dailyHours >= 6.4).map(([ownerId, dailyHours]) => ({ ownerId, dailyHours, capacityPercent: Math.round((dailyHours / 8) * 100) })).sort((a, b) => b.capacityPercent - a.capacityPercent)
  const scheduleStatus = timeline.isOverdue ? 'Overdue' : scheduleDelta < -5 ? `Behind schedule by ${Math.abs(scheduleDelta)}%` : scheduleDelta > 5 ? `Ahead of schedule by ${scheduleDelta}%` : 'On schedule'
  return { progress, done:count('DONE'), inProgress:count('IN_PROGRESS'), atRisk:count('AT_RISK'), blocked:count('BLOCKED'), todo:count('TODO'), scheduleProgress:timeline.scheduleProgress, scheduleDelta, remainingWorkingDays:timeline.remainingWorkingDays, scheduleStatus, attentionTasks:tasks.filter(task => task.status === 'BLOCKED' || task.status === 'AT_RISK'), upcomingMilestones, overdueMilestones, upcomingPlannedTasks, workloadAlerts }
}

export function getAiRecommendationLines(project: Project, intelligence: ProjectIntelligence) {
  if (project.id === 'm365-migration-project') {
    const hq = project.metrics?.find(metric => metric.label === 'HQ')
    const branch = project.metrics?.find(metric => metric.label === 'Branch')
    return [
      `ภาพรวมโครงการนำหน้าแผน ${Math.max(0, intelligence.scheduleDelta).toFixed(2)}% และยังไม่พบงาน Blocked หรือ At Risk`,
      hq ? `HQ ดำเนินการแล้ว ${((hq.completed / hq.total) * 100).toFixed(2)}% เหลือ ${(hq.total - hq.completed).toLocaleString()} เครื่อง ให้รักษาความเร็ว rollout ต่อเนื่อง` : 'ให้รักษาความเร็ว rollout ของ HQ ต่อเนื่อง',
      branch ? `Branch ดำเนินการแล้ว ${((branch.completed / branch.total) * 100).toFixed(2)}% เหลือ ${(branch.total - branch.completed).toLocaleString()} สาขา เป็น workstream ที่ควรติดตามเป็นพิเศษ` : 'Branch เป็น workstream ที่ควรติดตามเป็นพิเศษ',
      'ให้นันติดตาม weekly throughput ของ HQ และ Branch และปรับ resource หากความเร็ว rollout ของ Branch ลดลง',
    ]
  }

  if (intelligence.overdueMilestones.length) return ['มี milestone เกินกำหนด ควรทบทวนแผนและกำหนด owner สำหรับ recovery plan ทันที']
  if (intelligence.scheduleDelta < -5) return ['ความคืบหน้างานต่ำกว่า schedule ควรเร่งงานที่มี dependency และขจัด blocker บน critical path']
  if (intelligence.workloadAlerts.length) return ['พบ resource ใกล้หรือเกิน capacity ควรปรับการมอบหมายงานก่อนกระทบแผน']
  if (intelligence.attentionTasks.length) return [`ติดตาม owner ของ ${intelligence.attentionTasks.length} งานที่มีความเสี่ยงหรือถูก Blocked ก่อน เพื่อป้องกันผลกระทบต่อกำหนดส่ง`]
  return ['โครงการอยู่ในสถานะปกติ ให้ติดตาม milestone ถัดไปและงานกำลังดำเนินการอย่างต่อเนื่อง']
}

export function formatIntelligenceLines(project: Project, intelligence: ProjectIntelligence) {
  return [
    `WBS progress: ${intelligence.progress}% | Schedule: ${intelligence.scheduleProgress}%`,
    `Schedule status: ${intelligence.scheduleStatus} | Remaining: ${intelligence.remainingWorkingDays} working days`,
    ...(project.metrics?.map(metric => `• ${metric.label}: ${metric.completed.toLocaleString()} / ${metric.total.toLocaleString()} ${metric.unit ?? 'items'} (${((metric.completed / metric.total) * 100).toFixed(2)}%)${metric.detail ? ` — ${metric.detail}` : ''}`) ?? []),
    `✅ Done: ${intelligence.done} | 🔵 In progress: ${intelligence.inProgress} | ⚠️ At risk: ${intelligence.atRisk} | 🔴 Blocked: ${intelligence.blocked} | ⏳ To do: ${intelligence.todo}`,
    ...(intelligence.overdueMilestones.length ? [`🚨 Overdue milestones: ${intelligence.overdueMilestones.slice(0, 2).map(item => `${item.title} (${item.date})`).join(', ')}`] : []),
    ...(intelligence.upcomingMilestones.length ? [`📍 Upcoming milestones: ${intelligence.upcomingMilestones.slice(0, 2).map(item => `${item.title} (${item.date})`).join(', ')}`] : []),
    ...(intelligence.upcomingPlannedTasks.length ? [`🗓️ Planned actions: ${intelligence.upcomingPlannedTasks.slice(0, 2).map(item => `${item.title} (${item.date})`).join(', ')}`] : []),
    ...(intelligence.workloadAlerts.length ? [`👥 Capacity alerts: ${intelligence.workloadAlerts.slice(0, 2).map(item => `${item.ownerId} ${item.capacityPercent}% (${item.dailyHours.toFixed(1)}h/day)`).join(', ')}`] : []),
  ]
}
