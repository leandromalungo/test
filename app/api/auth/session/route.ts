import { NextResponse } from 'next/server'
import { getAuthenticatedContext } from '@/lib/auth/session'

/**
 * GET /api/auth/session
 * Devolve o utilizador autenticado e o respectivo registo de cliente (se aplicável).
 */
export async function GET() {
  const ctx = await getAuthenticatedContext()
  if (!ctx) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 })
  }
  return NextResponse.json({
    authenticated: true,
    user: ctx.user,
    customer: ctx.customer,
    authMode: ctx.authMode,
  })
}
