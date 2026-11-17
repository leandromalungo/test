import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/session'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { validateClimateSeries } from '@/services/climate/validation'

const validateBodySchema = z.object({
  farmId: z.string().min(1),
  provider: z.enum(['open_meteo_era5', 'nasa_power']).default('open_meteo_era5'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/climate/validate
 * Valida a qualidade das observações climáticas armazenadas para uma propriedade e janela temporal.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager', 'operator', 'farmer'])
  if (!auth.ok) return auth.response

  const body: unknown = await req.json()
  const parsed = validateBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros de validação climática inválidos.' },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const farm = state.farms.find((f) => f.id === parsed.data.farmId)
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
      { error: 'Acesso não autorizado a esta propriedade.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  const matchingObservations = state.climateObservations.filter(
    (o) =>
      o.providerCode === parsed.data.provider &&
      Math.abs(o.latitude - farm.latitude) < 0.15 &&
      Math.abs(o.longitude - farm.longitude) < 0.15
  )

  const summary = validateClimateSeries({
    observations: matchingObservations,
    windowStart: parsed.data.startDate,
    windowEnd: parsed.data.endDate,
    minCompletenessPercent: state.settings.defaultMinCompletenessPercent,
    targetLatitude: farm.latitude,
    targetLongitude: farm.longitude,
  })

  return NextResponse.json(
    { validation: summary },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
