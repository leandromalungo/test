import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/payments
 * Lista histórico de pagamentos simulados (prémios e indemnizações).
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const payments =
    auth.context.user.role === 'farmer'
      ? state.payments.filter((p) => p.customerId === auth.context.customer?.id)
      : state.payments

  return NextResponse.json({ payments }, { headers: NO_STORE_SECURITY_HEADERS })
}
