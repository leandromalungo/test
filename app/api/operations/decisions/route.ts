import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { operatorDecisionSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoResolveOperationalException,
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { calculateIndemnity } from '@/services/indemnities/indemnity-engine'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * POST /api/operations/decisions
 * Permite ao Operador aprovar, rejeitar ou escalar um caso excepcional,
 * garantindo atomicidade contra concorrência e bloqueio estrito de reabertura
 * após estado terminal (`approved` ou `rejected`).
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['operator', 'manager'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `op-decision:${auth.context.user.id}`,
    30,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas decisões operacionais submetidas num minuto.' },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = operatorDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Dados de decisão inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const result = await repoResolveOperationalException({
      exceptionId: parsed.data.exceptionId,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
      operatorUserId: auth.context.user.id,
      operatorFullName: auth.context.user.fullName,
      overrideObservedMm: parsed.data.overrideObservedMm,
      indemnityCalculator: calculateIndemnity,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: `OPERATOR_DECISION_${parsed.data.decision.toUpperCase()}`,
      entityType: 'operational_exception',
      entityId: result.exception.id,
      previousState: {
        exceptionStatus: result.previousExceptionStatus,
        eventStatus: result.previousEventStatus,
      },
      newState: {
        exceptionStatus: result.exception.status,
        eventStatus: result.event.status,
        reason: parsed.data.reason,
        calculatedIndemnityAoa: result.event.calculatedIndemnityAoa,
      },
      result: 'success',
    })

    return NextResponse.json(
      { exception: result.exception, event: result.event },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    if (err instanceof RepositoryNotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (err instanceof RepositoryConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao registar decisão operacional.',
      },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
