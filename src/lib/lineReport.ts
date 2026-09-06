import type { Project, Task } from '@/types'
import { formatIntelligenceLines, getAiRecommendationLines, getProjectIntelligence } from '@/lib/projectIntelligence'

export function buildManualProjectUpdateText(project: Project, tasks: Task[]) {
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
    ...formatIntelligenceLines(project, intelligence),
    '',
    '🤖 AI Summary:',
    ...aiSummary.map(item => `• ${item}`),
  ].join('\n')
}
