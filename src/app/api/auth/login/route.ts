import { NextRequest, NextResponse } from 'next/server'
import { createSession, verifyPassword } from '@/lib/localAuth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password) return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })

  const user = await db.user.findUnique({ where: { username } })
  if (!user || !user.active || user.systemRole === 'SUSPENDED' || !await verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
  }
  if (user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= new Date()) {
    return NextResponse.json({ error: 'Temporary password has expired. Please ask an administrator to reset it.' }, { status: 401 })
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession(user.id)
  return NextResponse.json({ user: { id: user.id, username: user.username, displayName: user.displayName, systemRole: user.systemRole, mustChangePassword: user.mustChangePassword } })
}
