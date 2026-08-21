import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'LINE webhook is ready' })
}

export async function POST(request: NextRequest) {
  const payload = await request.json()

  for (const event of payload.events ?? []) {
    const source = event.source
    if (source?.type === 'group' || source?.type === 'user') {
      console.log('LINE webhook source received', {
        sourceType: source.type,
        recipientId: source.groupId ?? source.userId,
        eventType: event.type,
      })
    }
  }

  return NextResponse.json({ received: true })
}
