import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/session'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  loadPlatformState,
  repoSaveStaffIndemnity,
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { calculateIndemnity } from '@/services/indemnities/indemnity-engine'
import { recordAuditLog } from '@/services/audit/audit-service'

const calcSchema = z.object({
  eventId: z.string().min(1),
  observedPrecipitationMm: z.number().min(0).optional(),
})

/**
 * POST /api/indemnities/calculate
 * Calcula (ou recalcula após validação operacional) a indemnização de um evento validado.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager', 'operator'])
  if (!auth.ok) return auth.response

  try {
    const body: unknown = await req.json()
    const parsed = calcSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos para cálculo.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const state = await loadPlatformState({
      role: auth.context.user.role,
      userId: auth.context.user.id,
    })
    const event = state.climateEvents.find((e) => e.id === parsed.data.eventId)
    if (!event) {
      return NextResponse.json(
        { error: 'Evento climático não encontrado.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (event.indemnityCalculationId) {
      const existing = state.indemnities.find(
        (i) => i.id === event.indemnityCalculationId
      )
      if (existing) {
        return NextResponse.json(
          { indemnity: existing, duplicatePrevented: true },
          { headers: NO_STORE_SECURITY_HEADERS }
        )
      }
    }

    const policy = state.policies.find((p) => p.id === event.policyId)
    if (!policy) {
      return NextResponse.json(
        { error: 'Apólice não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const observed =
      parsed.data.observedPrecipitationMm ?? event.observedPrecipitationMm
    if (observed === null) {
      return NextResponse.json(
        {
          error:
            'Não existe precipitação observada válida para calcular a indemnização.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const indemnityDraft = calculateIndemnity({
      event,
      policy,
      observedPrecipitationMm: observed,
    })

    const newEventStatus =
      indemnityDraft.calculatedIndemnityAoa > 0
        ? 'indemnity_calculated'
        : 'trigger_not_activated'

    const indemnity = await repoSaveStaffIndemnity({
      indemnity: indemnityDraft,
      newEventStatus,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'INDEMNITY_CALCULATED_BY_STAFF',
      entityType: 'indemnity',
      entityId: indemnity.id,
      newState: {
        calculatedIndemnityAoa: indemnity.calculatedIndemnityAoa,
        payoutPercentage: indemnity.payoutPercentage,
      },
      result: 'success',
    })

    return NextResponse.json(
      { indemnity },
      { status: 201, headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    if (err instanceof RepositoryConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (err instanceof RepositoryNotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao calcular indemnização.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
