import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, requireSystemAdmin } from '@/lib/localAuth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const roles = new Set(['SYSTEM_ADMIN', 'PORTFOLIO_MANAGER', 'STANDARD_USER', 'EXTERNAL_USER', 'SUSPENDED'])
const temporaryPassword = () => `${randomBytes(9).toString('base64url')}!`

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireSystemAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId } = await params
  const body = await request.json().catch(() => null) as { active?: unknown; systemRole?: unknown; resetPassword?: unknown } | null
  const data: { active?: boolean; systemRole?: 'SYSTEM_ADMIN' | 'PORTFOLIO_MANAGER' | 'STANDARD_USER' | 'EXTERNAL_USER' | 'SUSPENDED'; passwordHash?: string; mustChangePassword?: boolean; temporaryPasswordExpiresAt?: Date } = {}
  if (typeof body?.active === 'boolean') data.active = body.active
  if (typeof body?.systemRole === 'string' && roles.has(body.systemRole)) data.systemRole = body.systemRole as typeof data.systemRole
  let password: string | undefined
  if (body?.resetPassword === true) {
    password = temporaryPassword()
    data.passwordHash = await hashPassword(password)
    data.mustChangePassword = true
    data.temporaryPasswordExpiresAt = new Date(Date.now() + 7 * 86400000)
  }
  const user = await db.user.update({ where: { id: userId }, data }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  if (body?.resetPassword === true || body?.active === false) await db.userSession.deleteMany({ where: { userId } })
  return NextResponse.json({ user: { id: user.id, username: user.username, active: user.active, systemRole: user.systemRole }, ...(password ? { temporaryPassword: password, expiresAt: user.temporaryPasswordExpiresAt } : {}) })
}
