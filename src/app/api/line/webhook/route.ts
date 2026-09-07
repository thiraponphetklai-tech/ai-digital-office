import { NextRequest, NextResponse } from 'next/server'
import { discoverLineGroup, verifyLineWebhookSignature } from '@/lib/lineConfig'

export async function GET() {
  return NextResponse.json({ status: 'LINE webhook is ready' })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!await verifyLineWebhookSignature(rawBody, request.headers.get('x-line-signature'))) {
    return NextResponse.json({ error: 'Invalid LINE signature' }, { status: 401 })
  }
  const payload = JSON.parse(rawBody) as { events?: Array<{ source?: { type?: string; groupId?: string } }> }

  for (const event of payload.events ?? []) {
    const source = event.source
    if (source?.type === 'group' && source.groupId) await discoverLineGroup(source.groupId)
  }

  return NextResponse.json({ received: true })
}
