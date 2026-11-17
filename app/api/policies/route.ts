import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { policyCreateSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  loadPlatformState,
  repoCreatePolicyFromSimulation,
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/policies
 * Lista apólices com isolamento por proprietário (agricultor vê apenas as suas).
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const policies =
    auth.context.user.role === 'farmer'
      ? state.policies.filter((p) => p.customerId === auth.context.customer?.id)
      : state.policies

  return NextResponse.json({ policies }, { headers: NO_STORE_SECURITY_HEADERS })
}

/**
 * POST /api/policies
 * Subscreve uma apólice a partir de uma simulação validada, usando sequência atómica
 * no PostgreSQL para numeração (`NS-AGRO-AAAA-NNNN`) e gravando termos imutáveis.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `policy-create:${auth.context.user.id}`,
    15,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas emissões de apólice num curto período.' },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = policyCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Dados de subscrição inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const policy = await repoCreatePolicyFromSimulation({
      simulationId: parsed.data.simulationId,
      actorRole: auth.context.user.role,
      actorCustomerId: auth.context.customer?.id ?? null,
      startDate: parsed.data.startDate,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'POLICY_CREATED_PENDING_PAYMENT',
      entityType: 'policy',
      entityId: policy.id,
      newState: {
        policyNumber: policy.policyNumber,
        status: policy.status,
        productVersionNumber: policy.contractTerms.productVersionNumber,
        triggerThresholdMm: policy.contractTerms.triggerThresholdMm,
      },
      result: 'success',
    })

    return NextResponse.json(
      { policy },
      { status: 201, headers: NO_STORE_SECURITY_HEADERS }
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
    if (err instanceof Error && err.message === 'FORBIDDEN_SIMULATION') {
      return NextResponse.json(
        {
          error:
            'Não tem permissão para converter esta simulação em apólice.',
        },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Erro ao emitir apólice.',
      },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
