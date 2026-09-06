import { NextRequest, NextResponse } from 'next/server'
import { getLineDeliveryConfig } from '@/lib/lineConfig'

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getLineDeliveryConfig()
  if (!config) {
    return NextResponse.json({ error: 'LINE configuration is not set.' }, { status: 500 })
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: config.recipientId,
      messages: [{
        type: 'text',
        text: '✅ AI Digital Office เชื่อมต่อ LINE Group สำเร็จแล้ว',
      }],
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status })
  }

  return NextResponse.json({ sent: true })
}
