import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/payments/[id]
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
  const payment = state.payments.find((p) => p.id === id)
  if (!payment) {
    return NextResponse.json(
      { error: 'Pagamento não encontrado.' },
      { status: 404, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  if (
    auth.context.user.role === 'farmer' &&
    payment.customerId !== auth.context.customer?.id
  ) {
    return NextResponse.json(
      { error: 'Acesso não autorizado.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  return NextResponse.json({ payment }, { headers: NO_STORE_SECURITY_HEADERS })
}
