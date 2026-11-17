import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { paymentSimulateSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { simulatePayment } from '@/services/payments/payment-service'

/**
 * POST /api/payments/simulate
 * Processa um pagamento simulado idempotente de prémio (agricultor/gestor)
 * ou de indemnização (gestor).
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `pay:${auth.context.user.id}`,
    15,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Demasiadas tentativas de pagamento. Aguarde alguns segundos.',
      },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = paymentSimulateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Dados de pagamento inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      parsed.data.kind === 'indemnity' &&
      auth.context.user.role !== 'manager'
    ) {
      return NextResponse.json(
        {
          error:
            'Apenas o Gestor da NOSSA Seguros pode autorizar pagamento de indemnização.',
        },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const state = await loadPlatformState({
      role: auth.context.user.role,
      customerId: auth.context.customer?.id ?? null,
      userId: auth.context.user.id,
    })
    const policy = state.policies.find((p) => p.id === parsed.data.policyId)
    if (!policy) {
      return NextResponse.json(
        { error: 'Apólice não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      auth.context.user.role === 'farmer' &&
      policy.customerId !== auth.context.customer?.id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado a esta apólice.' },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const result = await simulatePayment({
      kind: parsed.data.kind,
      policyId: parsed.data.policyId,
      eventId: parsed.data.eventId ?? null,
      channel: parsed.data.channel,
      simulateOutcome: parsed.data.simulateOutcome,
      idempotencyKey: parsed.data.idempotencyKey,
      actorUserId: auth.context.user.id,
      actorEmail: auth.context.user.email,
      actorRole: auth.context.user.role,
    })
    return NextResponse.json(result, {
      status: result.idempotentReplay ? 200 : 201,
      headers: NO_STORE_SECURITY_HEADERS,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Erro ao simular pagamento.',
      },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
