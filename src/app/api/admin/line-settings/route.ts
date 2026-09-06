import { NextRequest, NextResponse } from 'next/server'
import { getLineConfigStatus, updateLineConfig } from '@/lib/lineConfig'
import { requireSystemAdmin } from '@/lib/localAuth'

export const runtime = 'nodejs'

export async function GET() {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await getLineConfigStatus())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read LINE configuration.' }, { status: 503 })
  }
}

export async function PUT(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as { channelAccessToken?: unknown; recipientId?: unknown } | null
  const channelAccessToken = typeof body?.channelAccessToken === 'string' ? body.channelAccessToken.trim() : undefined
  const recipientId = typeof body?.recipientId === 'string' ? body.recipientId.trim() : undefined
  if ((!channelAccessToken && !recipientId) || (channelAccessToken !== undefined && channelAccessToken.length < 20) || (recipientId !== undefined && recipientId.length < 4)) {
    return NextResponse.json({ error: 'Provide a valid channel access token or recipient ID.' }, { status: 400 })
  }
  try {
    await updateLineConfig({ channelAccessToken: channelAccessToken || undefined, recipientId: recipientId || undefined })
    return NextResponse.json(await getLineConfigStatus())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save LINE configuration.' }, { status: 503 })
  }
}
