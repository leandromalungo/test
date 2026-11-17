import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { climateFetchSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoGetFarmById,
  repoGetSystemSettings,
  repoSaveClimateObservations,
} from '@/lib/repositories/platform-repository'
import { getClimateProviderAdapter } from '@/services/climate/providers'
import { validateClimateSeries } from '@/services/climate/validation'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * POST /api/climate/fetch
 * Recolhe precipitação diária de um provedor externo real (Open-Meteo ERA5 ou NASA POWER)
 * para as coordenadas de uma propriedade agrícola, normaliza para milímetros e valida qualidade.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `climate-fetch:${auth.context.user.id}`,
    15,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Limite de consultas climáticas externas atingido. Aguarde 1 minuto.',
      },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = climateFetchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Parâmetros de consulta inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const farm = await repoGetFarmById(parsed.data.farmId)
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

    const adapter = getClimateProviderAdapter(parsed.data.provider)
    const result = await adapter.fetchDailyPrecipitation({
      latitude: farm.latitude,
      longitude: farm.longitude,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    })

    if (result.error) {
      await recordAuditLog({
        userId: auth.context.user.id,
        userEmail: auth.context.user.email,
        userRole: auth.context.user.role,
        action: 'CLIMATE_FETCH_EXTERNAL_FAILED',
        entityType: 'climate_provider',
        entityId: parsed.data.provider,
        metadata: {
          farmId: farm.id,
          error: result.error,
          sourceUrl: result.sourceUrl,
        },
        result: 'failure',
      })
      return NextResponse.json(
        { error: result.error, sourceUrl: result.sourceUrl },
        { status: 502, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const insertedCount = await repoSaveClimateObservations({
      observations: result.observations,
      farmId: farm.id,
      providerCode: parsed.data.provider,
      requestUrl: result.sourceUrl,
      windowStart: parsed.data.startDate,
      windowEnd: parsed.data.endDate,
      isSimulatedData: result.isSimulatedData,
    })

    const settings = await repoGetSystemSettings()
    const validation = validateClimateSeries({
      observations: result.observations,
      windowStart: parsed.data.startDate,
      windowEnd: parsed.data.endDate,
      minCompletenessPercent: settings.defaultMinCompletenessPercent,
      targetLatitude: farm.latitude,
      targetLongitude: farm.longitude,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'CLIMATE_DATA_FETCHED',
      entityType: 'farm',
      entityId: farm.id,
      newState: {
        provider: parsed.data.provider,
        observationsReturned: result.observations.length,
        insertedCount,
        accumulatedMm: validation.accumulatedPrecipitationMm,
        isSimulatedData: result.isSimulatedData,
      },
      metadata: { sourceUrl: result.sourceUrl, rawHash: result.rawHash },
      result: 'success',
    })

    return NextResponse.json(
      {
        provider: result.providerName,
        sourceUrl: result.sourceUrl,
        isSimulatedData: result.isSimulatedData,
        observations: result.observations,
        validation,
      },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao recolher observações climáticas.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
