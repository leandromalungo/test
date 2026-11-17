import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/session'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import { runBasisRiskAnalysis } from '@/services/risk/basis-risk-service'
import { recordAuditLog } from '@/services/audit/audit-service'

const basisSchema = z.object({
  province: z.string().min(2),
  coverageType: z.enum(['drought', 'excess_rain']),
  triggerThresholdMm: z.number().positive(),
  windowDays: z.number().int().min(7).max(90),
})

/**
 * POST /api/admin/basis-risk
 * Executa simulação histórica multi-ano de risco de base e comparação entre Open-Meteo e NASA POWER.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager', 'operator'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `basis-risk:${auth.context.user.id}`,
    10,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Limite de análises históricas atingido. Aguarde 1 minuto.' },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = basisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros de análise histórica inválidos.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const prov =
      ANGOLA_PROVINCES.find(
        (p) => p.name.toLowerCase() === parsed.data.province.toLowerCase()
      ) || ANGOLA_PROVINCES[0]

    const result = await runBasisRiskAnalysis({
      province: prov.name,
      latitude: prov.latitude,
      longitude: prov.longitude,
      coverageType: parsed.data.coverageType,
      triggerThresholdMm: parsed.data.triggerThresholdMm,
      windowDays: parsed.data.windowDays,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'BASIS_RISK_SIMULATION_EXECUTED',
      entityType: 'basis_risk',
      entityId: prov.code,
      newState: {
        falsePositiveCount: result.falsePositiveCount,
        falseNegativeCount: result.falseNegativeCount,
        disagreementCount: result.disagreementCount,
      },
      result: 'success',
    })

    return NextResponse.json(
      { analysis: result },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao executar análise de risco de base.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
