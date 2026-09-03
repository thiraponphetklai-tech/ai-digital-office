import { NextRequest, NextResponse } from 'next/server'
import { clearSession, getCurrentUser, hashPassword, verifyPassword } from '@/lib/localAuth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < 12) return NextResponse.json({ error: 'New password must contain at least 12 characters.' }, { status: 400 })

  const account = await db.user.findUnique({ where: { id: user.id } })
  if (!account || !await verifyPassword(currentPassword, account.passwordHash)) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false, temporaryPasswordExpiresAt: null } }),
    db.userSession.deleteMany({ where: { userId: user.id } }),
  ])
  await clearSession()
  return NextResponse.json({ ok: true, message: 'Password changed. Please sign in again.' })
}
