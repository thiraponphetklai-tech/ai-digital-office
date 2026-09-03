import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/localAuth'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
}
