import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/indemnities
 * Lista cálculos de indemnização realizados (isolado por cliente para agricultores).
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  if (auth.context.user.role === 'farmer') {
    const myPolicyIds = new Set(
      state.policies
        .filter((p) => p.customerId === auth.context.customer?.id)
        .map((p) => p.id)
    )
    return NextResponse.json(
      {
        indemnities: state.indemnities.filter((i) =>
          myPolicyIds.has(i.policyId)
        ),
      },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  return NextResponse.json(
    { indemnities: state.indemnities },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
