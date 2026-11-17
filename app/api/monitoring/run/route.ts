import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedContext } from '@/lib/auth/session'
import { monitoringRunSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  NO_STORE_SECURITY_HEADERS,
  timingSafeSecretMatch,
} from '@/lib/security/request-security'
import { runClimateMonitoring } from '@/services/monitoring/monitoring-engine'

/**
 * POST /api/monitoring/run
 * Executa o motor de monitorização climática para apólices activas.
 *
 * Pode ser invocado por:
 * 1. Gestor ou Operador autenticado através do painel web (com verificação CSRF).
 * 2. Serviço Cron externo através do cabeçalho `Authorization: Bearer <CRON_SECRET>` (comparação timing-safe).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const bearerToken = bearerMatch?.[1]?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()

  if (bearerToken) {
    if (!cronSecret || !timingSafeSecretMatch(bearerToken, cronSecret)) {
      return NextResponse.json(
        { error: 'Token Cron inválido ou não autorizado.' },
        { status: 401, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
  }

  const isAuthorizedCron =
    Boolean(bearerToken) &&
    Boolean(cronSecret) &&
    timingSafeSecretMatch(bearerToken, cronSecret)

  let actorUserId: string | null = null
  let actorEmail: string | null = 'cron@sistema'
  let actorRole: 'manager' | 'operator' | 'system' = 'system'

  if (!isAuthorizedCron) {
    const csrfError = enforceCsrfProtection(req)
    if (csrfError) return csrfError

    const ctx = await getAuthenticatedContext()
    if (!ctx) {
      return NextResponse.json(
        { error: 'Autenticação necessária.' },
        { status: 401, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (ctx.user.role !== 'manager' && ctx.user.role !== 'operator') {
      return NextResponse.json(
        {
          error:
            'Apenas Gestores ou Operadores podem executar a monitorização global.',
        },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    actorUserId = ctx.user.id
    actorEmail = ctx.user.email
    actorRole = ctx.user.role
  }

  const rate = await checkRateLimitDistributed(
    `monitoring:${actorUserId || 'cron'}`,
    10,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Demasiadas execuções de monitorização num minuto. Aguarde.',
      },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const rawBody: unknown = await req.json().catch(() => ({}))
    const parsed = monitoringRunSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Parâmetros de monitorização inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const report = await runClimateMonitoring({
      policyId: parsed.data.policyId,
      scenario: parsed.data.scenario,
      actorUserId,
      actorEmail,
      actorRole,
    })

    return NextResponse.json(
      { report },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao executar monitorização climática.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
