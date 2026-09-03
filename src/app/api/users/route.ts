import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, requireSystemAdmin } from '@/lib/localAuth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const roles = new Set(['SYSTEM_ADMIN', 'PORTFOLIO_MANAGER', 'STANDARD_USER', 'EXTERNAL_USER', 'SUSPENDED'])
const temporaryPassword = () => `${randomBytes(9).toString('base64url')}!`
type ListedUser = { id:string; username:string; displayName:string; systemRole:string; resourceId:string|null; active:boolean; mustChangePassword:boolean; temporaryPasswordExpiresAt:Date|null; lastLoginAt:Date|null; resource:{ name:string }|null; projectMemberships:{ projectId:string; role:string; project:{ name:string } }[] }

export async function GET() {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await db.user.findMany({ include: { resource: true, projectMemberships: { include: { project: true } } }, orderBy: { username: 'asc' } })
  return NextResponse.json((users as ListedUser[]).map(user => ({
    id: user.id, username: user.username, displayName: user.displayName, systemRole: user.systemRole, resourceId: user.resourceId,
    resourceName: user.resource?.name ?? null, active: user.active, mustChangePassword: user.mustChangePassword,
    temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt, lastLoginAt: user.lastLoginAt,
    memberships: user.projectMemberships.map((membership: ListedUser['projectMemberships'][number]) => ({ projectId: membership.projectId, projectName: membership.project.name, role: membership.role })),
  })))
}

export async function POST(request: NextRequest) {
  if (!await requireSystemAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => null) as { username?: unknown; displayName?: unknown; systemRole?: unknown; resourceId?: unknown } | null
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : ''
  const systemRole = typeof body?.systemRole === 'string' && roles.has(body.systemRole) ? body.systemRole as 'SYSTEM_ADMIN' | 'PORTFOLIO_MANAGER' | 'STANDARD_USER' | 'EXTERNAL_USER' | 'SUSPENDED' : 'STANDARD_USER'
  const resourceId = typeof body?.resourceId === 'string' && body.resourceId ? body.resourceId : null
  if (!/^[a-z0-9._-]{3,64}$/.test(username) || !displayName) return NextResponse.json({ error: 'Username must be 3–64 lowercase letters, numbers, dots, underscores, or hyphens; display name is required.' }, { status: 400 })

  const password = temporaryPassword()
  try {
    const user = await db.user.create({ data: { username, displayName, systemRole, resourceId, passwordHash: await hashPassword(password), mustChangePassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 7 * 86400000) } })
    return NextResponse.json({ user: { id: user.id, username: user.username, displayName: user.displayName }, temporaryPassword: password, expiresAt: user.temporaryPasswordExpiresAt }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Username or linked resource already exists.' }, { status: 409 })
  }
}
