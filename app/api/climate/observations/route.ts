import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/climate/observations
 * Lista observações climáticas recolhidas (reais e de demonstração explicitamente identificadas),
 * comparações entre fontes e fornecedores configurados.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const farmId = req.nextUrl.searchParams.get('farmId')
  const provider = req.nextUrl.searchParams.get('provider')

  let observations = [...state.climateObservations]

  if (farmId) {
    const farm = state.farms.find((f) => f.id === farmId)
    if (!farm) {
      return NextResponse.json(
        { error: 'Propriedade não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (
      auth.context.user.role === 'farmer' &&
      farm.customerId !== auth.context.customer?.id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado.' },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    observations = observations.filter(
      (o) =>
        Math.abs(o.latitude - farm.latitude) < 0.15 &&
        Math.abs(o.longitude - farm.longitude) < 0.15
    )
  } else if (auth.context.user.role === 'farmer') {
    const myFarms = state.farms.filter(
      (f) => f.customerId === auth.context.customer?.id
    )
    observations = observations.filter((o) =>
      myFarms.some(
        (f) =>
          Math.abs(o.latitude - f.latitude) < 0.15 &&
          Math.abs(o.longitude - f.longitude) < 0.15
      )
    )
  }

  if (provider) {
    observations = observations.filter((o) => o.providerCode === provider)
  }

  observations.sort((a, b) =>
    b.observationDate.localeCompare(a.observationDate)
  )

  return NextResponse.json(
    {
      observations: observations.slice(0, 120),
      comparisons: state.climateComparisons.slice(0, 30),
      providers: state.climateProviders,
    },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
