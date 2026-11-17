import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/events/[id]
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
  const event = state.climateEvents.find((e) => e.id === id)
  if (!event) {
    return NextResponse.json(
      { error: 'Evento climático não encontrado.' },
      { status: 404, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  if (
    auth.context.user.role === 'farmer' &&
    event.customerId !== auth.context.customer?.id
  ) {
    return NextResponse.json(
      { error: 'Acesso não autorizado.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  const indemnity = event.indemnityCalculationId
    ? state.indemnities.find((i) => i.id === event.indemnityCalculationId) ??
      null
    : null
  const comparison = event.comparisonId
    ? state.climateComparisons.find((c) => c.id === event.comparisonId) ?? null
    : null
  const exception = state.exceptions.find((ex) => ex.eventId === event.id) ?? null

  return NextResponse.json(
    { event, indemnity, comparison, exception },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
