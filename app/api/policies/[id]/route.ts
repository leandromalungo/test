import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/policies/[id]
 * Devolve os detalhes completos da apólice, eventos climáticos e pagamentos associados.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const policy = state.policies.find((p) => p.id === id)
  if (!policy) {
    return NextResponse.json(
      { error: 'Apólice não encontrada.' },
      { status: 404, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  if (
    auth.context.user.role === 'farmer' &&
    policy.customerId !== auth.context.customer?.id
  ) {
    return NextResponse.json(
      { error: 'Acesso não autorizado a esta apólice.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  const events = state.climateEvents.filter((e) => e.policyId === policy.id)
  const payments = state.payments.filter((p) => p.policyId === policy.id)
  const indemnities = state.indemnities.filter((i) => i.policyId === policy.id)

  return NextResponse.json(
    { policy, events, payments, indemnities },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
