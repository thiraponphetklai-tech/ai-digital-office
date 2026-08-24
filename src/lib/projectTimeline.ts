import type { Project } from '@/types'

export const COMPANY_HOLIDAYS = [
  { date: '2026-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ' },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช' },
  { date: '2026-10-23', name: 'วันปิยมหาราช' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
  { date: '2026-12-31', name: 'วันสิ้นปี' },
]

export interface ProjectTimeline {
  totalWorkingDays: number
  elapsedWorkingDays: number
  remainingWorkingDays: number
  scheduleProgress: number
  isNotStarted: boolean
  isOverdue: boolean
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)
const startOfDay = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function countWorkingDays(start: Date, end: Date, project: Project) {
  const excludedDates = new Set([
    ...COMPANY_HOLIDAYS.map(holiday => holiday.date),
    ...(project.calendar?.holidays ?? []).map(holiday => holiday.date),
  ])
  const workingDays = project.calendar?.workingDays ?? [1, 2, 3, 4, 5]
  let count = 0
  const cursor = new Date(start)

  while (cursor <= end) {
    if (workingDays.includes(cursor.getDay()) && !excludedDates.has(dayKey(cursor))) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export function getProjectTimeline(project: Project, now = new Date()): ProjectTimeline {
  const start = startOfDay(project.startDate)
  const target = startOfDay(project.targetDate)
  const today = startOfDay(now)
  const totalWorkingDays = Math.max(1, countWorkingDays(start, target, project))
  const isNotStarted = today < start
  const isOverdue = today > target
  const elapsedEnd = today < target ? today : target
  const elapsedWorkingDays = isNotStarted ? 0 : Math.min(totalWorkingDays, countWorkingDays(start, elapsedEnd, project))
  const remainingStart = today > start ? today : start
  const remainingWorkingDays = isOverdue ? 0 : countWorkingDays(remainingStart, target, project)

  return {
    totalWorkingDays,
    elapsedWorkingDays,
    remainingWorkingDays,
    scheduleProgress: Number(((elapsedWorkingDays / totalWorkingDays) * 100).toFixed(2)),
    isNotStarted,
    isOverdue,
  }
}
