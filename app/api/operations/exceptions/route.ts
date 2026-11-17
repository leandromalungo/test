import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/operations/exceptions
 * Lista excepções operacionais e respectivas evidências climáticas associadas para o Operador.
 */
export async function GET() {
  const auth = await requireRole(['operator', 'manager'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    userId: auth.context.user.id,
  })
  const enriched = state.exceptions.map((ex) => {
    const event = state.climateEvents.find((e) => e.id === ex.eventId) ?? null
    const comparison = event?.comparisonId
      ? state.climateComparisons.find((c) => c.id === event.comparisonId) ??
        null
      : null
    const policy = state.policies.find((p) => p.id === ex.policyId) ?? null
    return {
      ...ex,
      event,
      comparison,
      policy,
    }
  })

  return NextResponse.json(
    { exceptions: enriched },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
