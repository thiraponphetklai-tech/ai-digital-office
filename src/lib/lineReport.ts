import type { Project, Task } from '@/types'
import { formatIntelligenceLines, getAiRecommendationLines, getProjectIntelligence } from '@/lib/projectIntelligence'

const statusLabels: Record<Task['status'], string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

function shorten(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

/** Keep the complete LINE text below its 5,000-character limit while listing WBS work items. */
export function buildWbsTaskLines(tasks: Task[], ownerNames: Record<string, string> = {}, characterBudget = 3000) {
  const lines = [`📋 WBS tasks (${tasks.length} items):`]
  let used = lines[0].length
  let included = 0

  for (const task of tasks) {
    const description = task.description?.trim() ? shorten(task.description.trim(), 180) : 'No description'
    const item = [
      `• ${shorten(task.title, 120)}`,
      `  Status: ${statusLabels[task.status]} | Progress: ${Math.round(task.progress)}% | Owner: ${ownerNames[task.ownerId] ?? task.ownerId}`,
      `  Description: ${description}`,
    ].join('\n')
    if (used + item.length + 1 > characterBudget) break
    lines.push(item)
    used += item.length + 1
    included += 1
  }

  if (included < tasks.length) lines.push(`• แสดง ${included}/${tasks.length} งาน เพื่อไม่ให้ข้อความเกินขีดจำกัด LINE`)
  return lines
}

export function buildManualProjectUpdateText(project: Project, tasks: Task[], ownerNames: Record<string, string> = {}) {
  const intelligence = getProjectIntelligence(project, tasks)
  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())
  const plannedTasks = tasks.filter(task => intelligence.upcomingPlannedTasks.some(action => action.title === task.title))
  const aiSummary = [
    intelligence.attentionTasks.length ? `ติดตาม ${intelligence.attentionTasks.length} งานที่มีความเสี่ยง: ${intelligence.attentionTasks.slice(0, 2).map(task => task.title).join(', ')}` : 'ไม่พบงาน Blocked หรือ At Risk ในขณะนี้',
    ...plannedTasks.slice(0, 2).map(task => `แผนปฏิบัติการ: ${task.description ?? task.title}`),
    ...getAiRecommendationLines(project, intelligence),
  ]

  return [
    `📊 Project Update — ${project.name}`,
    `วันที่ ${date}`,
    '',
    ...formatIntelligenceLines(project, intelligence, ownerNames),
    '',
    ...buildWbsTaskLines(tasks, ownerNames),
    '',
    '🤖 AI Summary:',
    ...aiSummary.map(item => `• ${item}`),
  ].join('\n')
}
