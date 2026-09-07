import { getLineDeliveryConfig } from '@/lib/lineConfig'

type AssignmentNotification = {
  projectName: string
  taskTitle: string
  dueDate: Date | null
  ownerNames: string[]
}

/** Sends only an assignment notice. Callers must persist the task first. */
export async function sendTaskAssignmentNotification(notification: AssignmentNotification) {
  const config = await getLineDeliveryConfig()
  if (!config || notification.ownerNames.length === 0) return false

  const dueDate = notification.dueDate
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(notification.dueDate)
    : null
  const text = [
    `📌 มอบหมายงานใหม่ — ${notification.projectName}`,
    `คุณ${notification.ownerNames.join(' และคุณ')} รบกวนรับงาน “${notification.taskTitle}” ด้วยครับ`,
    dueDate ? `กำหนดส่ง: ${dueDate}` : 'ยังไม่ได้กำหนดวันส่ง',
    'หากมีข้อจำกัดหรือประเด็นที่ต้องช่วยแจ้งในระบบได้เลยครับ',
  ].join('\n')

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
