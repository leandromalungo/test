import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/admin/overview
 * Fornece métricas agregadas de gestão para o portal administrativo da NOSSA Seguros.
 */
export async function GET() {
  const auth = await requireRole(['manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    userId: auth.context.user.id,
  })
  const activePolicies = state.policies.filter((p) => p.status === 'active')
  const totalExposureAoa = activePolicies.reduce(
    (sum, p) => sum + p.insuredCapitalAoa,
    0
  )
  const totalPremiumsAoa = state.policies
    .filter((p) => p.status === 'active' || p.status === 'expired')
    .reduce((sum, p) => sum + p.premiumAoa, 0)
  const totalIndemnitiesAoa = state.indemnities.reduce(
    (sum, i) => sum + i.calculatedIndemnityAoa,
    0
  )

  return NextResponse.json(
    {
      metrics: {
        totalCustomers: state.customers.length,
        totalFarms: state.farms.length,
        totalProducts: state.products.length,
        totalPolicies: state.policies.length,
        activePolicies: activePolicies.length,
        totalExposureAoa,
        totalPremiumsAoa,
        totalIndemnitiesAoa,
        openExceptions: state.exceptions.filter(
          (e) => e.status === 'open' || e.status === 'escalated'
        ).length,
        activatedEvents: state.climateEvents.filter(
          (e) =>
            e.status === 'trigger_activated' ||
            e.status === 'indemnity_calculated' ||
            e.status === 'paid'
        ).length,
      },
      customers: state.customers,
      recentEvents: state.climateEvents.slice(0, 8),
      recentPayments: state.payments.slice(0, 8),
      exceptions: state.exceptions,
    },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
