import { NextRequest, NextResponse } from 'next/server'
import {
  MOCK_BITLOCKER_PROJECT,
  MOCK_DIGITAL_OFFICE_PROJECT,
  MOCK_PROJECT,
  MOCK_TASKS,
} from '@/data/mockData'

const projects = [MOCK_PROJECT, MOCK_BITLOCKER_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT]

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  if (!token || !recipientId) {
    return NextResponse.json({ error: 'LINE environment variables are not configured' }, { status: 500 })
  }

  const { projectId = 'bitlocker-migration' } = await request.json().catch(() => ({}))
  const project = projects.find(item => item.id === projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const tasks = MOCK_TASKS.filter(task => task.projectId === project.id)
  const count = (status: string) => tasks.filter(task => task.status === status).length
  const progress = tasks.length
    ? Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length)
    : 0
  const attention = tasks.filter(task => task.status === 'BLOCKED' || task.status === 'AT_RISK')
  const activeWork = tasks.filter(task => task.status === 'IN_PROGRESS')
  const followUps = [...attention, ...activeWork].slice(0, 3)

  const message = [
    `📊 AI Project Analysis — ${project.name}`,
    `วันที่ ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date())}`,
    '',
    `Overall progress: ${progress}%`,
    `✅ Done: ${count('DONE')} | 🔵 In progress: ${count('IN_PROGRESS')}`,
    `⚠️ At risk: ${count('AT_RISK')} | 🔴 Blocked: ${count('BLOCKED')} | ⏳ To do: ${count('TODO')}`,
    '',
    followUps.length ? 'งานที่ควรติดตาม:' : 'สถานะการติดตาม:',
    ...(followUps.length
      ? followUps.map(task => `• ${task.title} — ${task.blocker || task.description || task.status}`)
      : ['• ไม่มีงาน Blocked หรือ At Risk ในขณะนี้']),
    '',
    '🤖 AI Recommendation:',
    attention.length
      ? `ติดตาม owner ของ ${attention.length} งานที่มีความเสี่ยงหรือถูก Blocked ก่อน เพื่อป้องกันผลกระทบต่อกำหนดส่ง`
      : activeWork.length
        ? `ติดตามความคืบหน้าของ ${activeWork.length} งานที่กำลังดำเนินการ และเตรียมปิดงานที่ใกล้เสร็จ`
        : 'โครงการอยู่ในสถานะปกติ ให้ตรวจสอบงาน To do และกำหนด owner สำหรับขั้นตอนถัดไป',
  ].join('\n')

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: recipientId, messages: [{ type: 'text', text: message }] }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true, projectId: project.id, message })
}
