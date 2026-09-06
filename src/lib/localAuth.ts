import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'digital-office-session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

export type AuthUser = {
  id: string
  username: string
  displayName: string
  systemRole: 'SYSTEM_ADMIN' | 'PORTFOLIO_MANAGER' | 'STANDARD_USER' | 'EXTERNAL_USER' | 'SUSPENDED'
  resourceId: string | null
  mustChangePassword: boolean
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expected] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const actual = await scrypt(password, salt, 64) as Buffer
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await db.userSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await db.userSession.deleteMany({ where: { tokenHash: hashToken(token) } })
  cookieStore.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.userSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt <= new Date() || !session.user.active || session.user.systemRole === 'SUSPENDED') {
    if (session) await db.userSession.delete({ where: { id: session.id } })
    return null
  }
  return session.user
}

export function isSystemAdmin(user: AuthUser) {
  return user.systemRole === 'SYSTEM_ADMIN'
}

export async function requireSystemAdmin() {
  const user = await getCurrentUser()
  return user && isSystemAdmin(user) ? user : null
}

export async function canAccessProject(user: AuthUser, projectId: string) {
  if (user.systemRole === 'SYSTEM_ADMIN' || user.systemRole === 'PORTFOLIO_MANAGER') return true
  const membership = await db.projectUserMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } }, select: { expiresAt: true } })
  return Boolean(membership && (!membership.expiresAt || membership.expiresAt > new Date()))
}
