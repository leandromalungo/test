import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/insurance/simulations
 * Lista simulações efectuadas pelo agricultor autenticado ou todas (para Gestor).
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const simulations =
    auth.context.user.role === 'farmer'
      ? state.simulations.filter((s) => s.customerId === auth.context.customer?.id)
      : state.simulations

  return NextResponse.json(
    { simulations },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
