import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/events
 * Lista eventos climáticos detectados. Agricultores vêem apenas os das suas apólices.
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const events =
    auth.context.user.role === 'farmer'
      ? state.climateEvents.filter(
          (e) => e.customerId === auth.context.customer?.id
        )
      : state.climateEvents

  return NextResponse.json({ events }, { headers: NO_STORE_SECURITY_HEADERS })
}
