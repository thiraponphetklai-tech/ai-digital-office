import { getLineDeliveryConfig } from '@/lib/lineConfig'

type AssignmentNotification = {
  projectId: string
  projectName: string
  taskTitle: string
  dueDate: Date | null
  ownerNames: string[]
  appUrl?: string
}

/** Sends only an assignment notice. Callers must persist the task first. */
export async function sendTaskAssignmentNotification(notification: AssignmentNotification) {
  const config = await getLineDeliveryConfig(notification.projectId)
  if (!config || notification.ownerNames.length === 0) return false

  const dueDate = notification.dueDate
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(notification.dueDate)
    : null
  const text = [
    `📌 มอบหมายงานใหม่ — ${notification.projectName}`,
    `คุณ${notification.ownerNames.join(' คุณ')} คุณได้รับ assign งาน “${notification.taskTitle}” จากหัวหน้าทีมของคุณ`,
    dueDate ? `กำหนดส่ง: ${dueDate}` : 'ยังไม่ได้กำหนดวันส่ง',
    'หากมีข้อจำกัดหรือประเด็นที่ต้องช่วยแจ้งในระบบได้เลยครับ',
    notification.appUrl ? `🔗 เข้าระบบ: ${notification.appUrl}` : null,
  ].filter((line): line is string => Boolean(line)).join('\n')

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: config.recipientId, messages: [{ type: 'text', text }] }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.warn('LINE task assignment notification failed:', response.status)
      return false
    }
    return true
  } catch (error) {
    console.warn('LINE task assignment notification could not be delivered.', error)
    return false
  }
}
