import { NextRequest, NextResponse } from 'next/server'
import { addLineGroup, deleteLineGroup, getLineConfigStatus, getLineGroups, selectLineGroup, updateLineConfig } from '@/lib/lineConfig'
import { requireSystemAdmin } from '@/lib/localAuth'

export const runtime = 'nodejs'

export async function GET() {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const appUrl = process.env.APP_BASE_URL?.replace(/\/$/, '')
    return NextResponse.json({ ...(await getLineConfigStatus()), groups: await getLineGroups(), webhookUrl: appUrl ? `${appUrl}/api/line/webhook` : null })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read LINE configuration.' }, { status: 503 })
  }
}

export async function PUT(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as { channelAccessToken?: unknown; channelSecret?: unknown; recipientId?: unknown } | null
  const channelAccessToken = typeof body?.channelAccessToken === 'string' ? body.channelAccessToken.trim() : undefined
  const channelSecret = typeof body?.channelSecret === 'string' ? body.channelSecret.trim() : undefined
  const recipientId = typeof body?.recipientId === 'string' ? body.recipientId.trim() : undefined
  if ((!channelAccessToken && !channelSecret && !recipientId) || (channelAccessToken !== undefined && channelAccessToken.length < 20) || (channelSecret !== undefined && channelSecret.length < 16) || (recipientId !== undefined && recipientId.length < 4)) {
    return NextResponse.json({ error: 'Provide a valid channel access token, channel secret, or recipient ID.' }, { status: 400 })
  }
  try {
    await updateLineConfig({ channelAccessToken: channelAccessToken || undefined, channelSecret: channelSecret || undefined, recipientId: recipientId || undefined })
    return NextResponse.json(await getLineConfigStatus())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save LINE configuration.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as { name?: unknown; recipientId?: unknown; selectedGroupId?: unknown } | null
  try {
    if (typeof body?.selectedGroupId === 'string') await selectLineGroup(body.selectedGroupId)
    else if (typeof body?.name === 'string' && typeof body.recipientId === 'string' && body.name.trim().length > 0 && body.recipientId.trim().length >= 4) await addLineGroup(body.name.trim().slice(0, 80), body.recipientId.trim())
    else return NextResponse.json({ error: 'Provide a group name and ID, or select a group.' }, { status: 400 })
    return NextResponse.json({ ...(await getLineConfigStatus()), groups: await getLineGroups() })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save LINE group.' }, { status: 400 }) }
}

export async function DELETE(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const groupId = new URL(request.url).searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  try { await deleteLineGroup(groupId); return NextResponse.json({ ...(await getLineConfigStatus()), groups: await getLineGroups() }) }
  catch { return NextResponse.json({ error: 'Unable to remove LINE group.' }, { status: 400 }) }
}
