import type { Task } from '@/types'

const COLUMNS: Array<[string, (task: Task) => string | number | undefined]> = [
  ['Task ID', task => task.id],
  ['Task Name', task => task.title],
  ['Description', task => task.description],
  ['Owner', task => task.ownerId],
  ['Team', task => task.teamId],
  ['Status', task => task.status],
  ['Priority', task => task.priority],
  ['Progress', task => task.progress],
  ['Due Date', task => task.dueDate],
  ['Blocker', task => task.blocker],
]

function escapeCsv(value: string | number | undefined) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export function downloadTasksCsv(projectName: string, tasks: Task[]) {
  const rows = [
    COLUMNS.map(([label]) => escapeCsv(label)).join(','),
    ...tasks.map(task => COLUMNS.map(([, getValue]) => escapeCsv(getValue(task))).join(',')),
  ]
  const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename = projectName.replaceAll(/[^a-z0-9]+/gi, '-').replaceAll(/(^-|-$)/g, '').toLowerCase()

  link.href = url
  link.download = `${filename || 'project'}-tasks.csv`
  link.click()
  URL.revokeObjectURL(url)
}
