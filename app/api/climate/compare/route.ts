import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { climateCompareSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoGetFarmById,
  repoGetSystemSettings,
  repoSaveClimateComparison,
} from '@/lib/repositories/platform-repository'
import { openMeteoAdapter } from '@/services/climate/providers/open-meteo'
import { nasaPowerAdapter } from '@/services/climate/providers/nasa-power'
import { validateClimateSeries } from '@/services/climate/validation'
import { compareClimateSources } from '@/services/climate/comparison'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * POST /api/climate/compare
 * Compara precipitação acumulada entre a fonte primária (Open-Meteo ERA5) e a fonte secundária (NASA POWER).
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager', 'operator', 'farmer'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `climate-compare:${auth.context.user.id}`,
    15,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Limite de comparações climáticas atingido. Aguarde 1 minuto.',
      },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = climateCompareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Parâmetros de comparação inválidos.',
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
        { error: 'Acesso não autorizado a esta propriedade.' },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const settings = await repoGetSystemSettings()
    const threshold =
      parsed.data.disagreementThresholdPercent ??
      settings.defaultDisagreementThresholdPercent

    if (parsed.data.mode === 'demo_disagreement') {
      if (auth.context.user.role === 'farmer') {
        return NextResponse.json(
          {
            error:
              'Simulação de discordância reservada a Operadores e Gestores.',
          },
          { status: 403, headers: NO_STORE_SECURITY_HEADERS }
        )
      }
      const comparisonDraft = compareClimateSources({
        farmId: farm.id,
        policyId: parsed.data.policyId ?? null,
        windowStart: parsed.data.startDate,
        windowEnd: parsed.data.endDate,
        primaryProvider: 'Open-Meteo ERA5 / ERA5-Land',
        secondaryProvider: 'NASA POWER Daily Agroclimatology',
        primaryAccumulatedMm: 218.5,
        secondaryAccumulatedMm: 108.0,
        thresholdPercent: threshold,
      })
      const comparison = await repoSaveClimateComparison(comparisonDraft)

      await recordAuditLog({
        userId: auth.context.user.id,
        userEmail: auth.context.user.email,
        userRole: auth.context.user.role,
        action: 'CLIMATE_SOURCES_COMPARED_DEMO_DISAGREEMENT',
        entityType: 'climate_comparison',
        entityId: comparison.id,
        newState: {
          disagreementPercent: comparison.disagreementPercent,
          passed: comparison.passed,
        },
        result: comparison.passed ? 'success' : 'blocked',
      })

      return NextResponse.json(
        { comparison, mode: 'demo_disagreement' },
        { headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const [omRes, npRes] = await Promise.all([
      openMeteoAdapter.fetchDailyPrecipitation({
        latitude: farm.latitude,
        longitude: farm.longitude,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      }),
      nasaPowerAdapter.fetchDailyPrecipitation({
        latitude: farm.latitude,
        longitude: farm.longitude,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      }),
    ])

    const omVal = validateClimateSeries({
      observations: omRes.observations,
      windowStart: parsed.data.startDate,
      windowEnd: parsed.data.endDate,
      minCompletenessPercent: settings.defaultMinCompletenessPercent,
      targetLatitude: farm.latitude,
      targetLongitude: farm.longitude,
    })

    const npVal = validateClimateSeries({
      observations: npRes.observations,
      windowStart: parsed.data.startDate,
      windowEnd: parsed.data.endDate,
      minCompletenessPercent: settings.defaultMinCompletenessPercent,
      targetLatitude: farm.latitude,
      targetLongitude: farm.longitude,
    })

    const comparisonDraft = compareClimateSources({
      farmId: farm.id,
      policyId: parsed.data.policyId ?? null,
      windowStart: parsed.data.startDate,
      windowEnd: parsed.data.endDate,
      primaryProvider: omRes.providerName,
      secondaryProvider: npRes.providerName,
      primaryAccumulatedMm: omVal.accumulatedPrecipitationMm,
      secondaryAccumulatedMm: npVal.accumulatedPrecipitationMm,
      thresholdPercent: threshold,
    })

    const comparison = await repoSaveClimateComparison(comparisonDraft)

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'CLIMATE_SOURCES_COMPARED_LIVE',
      entityType: 'climate_comparison',
      entityId: comparison.id,
      newState: {
        primaryAccumulatedMm: comparison.primaryAccumulatedMm,
        secondaryAccumulatedMm: comparison.secondaryAccumulatedMm,
        disagreementPercent: comparison.disagreementPercent,
        passed: comparison.passed,
      },
      result: comparison.passed ? 'success' : 'blocked',
    })

    return NextResponse.json(
      {
        comparison,
        primaryValidation: omVal,
        secondaryValidation: npVal,
        mode: 'live',
      },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao comparar fontes climáticas.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
