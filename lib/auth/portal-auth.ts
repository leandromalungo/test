import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  getClientIp,
  verifySameOrigin,
} from '@/lib/security/request-security'
import {
  createSignedSessionToken,
  DEMO_SESSION_COOKIE,
  getAuthCookieOptions,
  NO_STORE_AUTH_HEADERS,
} from '@/lib/auth/session'
import { getDemoDatabase, verifyDemoPassword } from '@/lib/store/database'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { recordAuditLog } from '@/services/audit/audit-service'
import type { UserRole } from '@/types/domain'

export { verifySameOrigin }

/**
 * Autenticação estrita por portal no servidor.
 *
 * Medidas de segurança aplicadas:
 * 1. Verificação de Content-Type JSON e defesa CSRF de mesma origem (Origin/Referer/Sec-Fetch-Site).
 * 2. Rate limiting distribuído por IP e bloqueio temporário anti-força-bruta por conta+portal.
 * 3. Validação estrita com Zod (.strict()) que rejeita campos injectados no payload.
 * 4. Vinculação rígida entre o endpoint de login e o papel esperado (`farmer`, `manager`, `operator`):
 *    credenciais de um perfil nunca conseguem iniciar sessão através do portal de outro perfil.
 * 5. Mensagem de erro uniforme (401) para prevenir enumeração de contas e papéis.
 * 6. Registo imutável em auditoria de tentativas falhadas, bloqueios e desvios de portal.
 */

const PORTAL_SECURITY_LIMITS: Record<
  UserRole,
  { ipMaxPerMinute: number; accountMaxAttempts: number; lockoutWindowMs: number }
> = {
  farmer: { ipMaxPerMinute: 15, accountMaxAttempts: 8, lockoutWindowMs: 15 * 60_000 },
  manager: { ipMaxPerMinute: 10, accountMaxAttempts: 5, lockoutWindowMs: 15 * 60_000 },
  operator: { ipMaxPerMinute: 10, accountMaxAttempts: 5, lockoutWindowMs: 15 * 60_000 },
}

const GENERIC_AUTH_ERROR =
  'Credenciais inválidas ou conta não autorizada para este portal.'

export async function authenticateForPortal(
  req: NextRequest,
  expectedRole: UserRole
): Promise<NextResponse> {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const limits = PORTAL_SECURITY_LIMITS[expectedRole]
  const ip = getClientIp(req)

  const ipRate = await checkRateLimitDistributed(
    `portal-login-ip:${expectedRole}:${ip}`,
    limits.ipMaxPerMinute,
    60_000
  )
  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        error: `Demasiadas tentativas a partir desta ligação. Aguarde ${ipRate.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_AUTH_HEADERS,
          'Retry-After': String(ipRate.retryAfterSeconds),
        },
      }
    )
  }

  try {
    const rawBody: unknown = await req.json()
    const parsed = loginSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Dados de autenticação inválidos.',
        },
        { status: 400, headers: NO_STORE_AUTH_HEADERS }
      )
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password

    // Bloqueio distribuído por conta + portal para travar ataques de força bruta dirigidos
    const accountRate = await checkRateLimitDistributed(
      `portal-login-acc:${expectedRole}:${normalizedEmail}`,
      limits.accountMaxAttempts,
      limits.lockoutWindowMs
    )
    if (!accountRate.allowed) {
      await recordAuditLog({
        userId: null,
        userEmail: normalizedEmail,
        userRole: expectedRole,
        action: 'PORTAL_LOGIN_LOCKOUT',
        entityType: 'auth_portal',
        entityId: expectedRole,
        metadata: {
          ip,
          retryAfterSeconds: accountRate.retryAfterSeconds,
          rateLimitBackend: accountRate.backend,
        },
        result: 'blocked',
      })
      return NextResponse.json(
        {
          error: `Conta temporariamente bloqueada neste portal por excesso de tentativas falhadas. Aguarde ${Math.ceil(accountRate.retryAfterSeconds / 60)} min.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_AUTH_HEADERS,
            'Retry-After': String(accountRate.retryAfterSeconds),
          },
        }
      )
    }

    // 1. Caminho de Produção: Supabase Auth + PostgreSQL
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient()
      if (!supabase) {
        return NextResponse.json(
          { error: 'Serviço de autenticação Supabase indisponível.' },
          { status: 503, headers: NO_STORE_AUTH_HEADERS }
        )
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (error || !data.user) {
        await recordAuditLog({
          userId: null,
          userEmail: normalizedEmail,
          userRole: expectedRole,
          action: 'PORTAL_LOGIN_FAILED',
          entityType: 'auth_portal',
          entityId: expectedRole,
          metadata: { ip, mode: 'supabase' },
          result: 'failure',
        })
        return NextResponse.json(
          { error: GENERIC_AUTH_ERROR },
          { status: 401, headers: NO_STORE_AUTH_HEADERS }
        )
      }

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      const actualRole = (roleRow?.role as UserRole | undefined) || 'farmer'
      if (actualRole !== expectedRole) {
        // Termina imediatamente a sessão Supabase se o utilizador pertence a outro portal
        await supabase.auth.signOut()
        await recordAuditLog({
          userId: data.user.id,
          userEmail: normalizedEmail,
          userRole: actualRole,
          action: 'PORTAL_LOGIN_ROLE_MISMATCH',
          entityType: 'auth_portal',
          entityId: expectedRole,
          metadata: { expectedRole, actualRole, ip, mode: 'supabase' },
          result: 'blocked',
        })
        return NextResponse.json(
          { error: GENERIC_AUTH_ERROR },
          { status: 401, headers: NO_STORE_AUTH_HEADERS }
        )
      }

      await recordAuditLog({
        userId: data.user.id,
        userEmail: normalizedEmail,
        userRole: expectedRole,
        action: 'PORTAL_LOGIN_SUCCESS',
        entityType: 'user',
        entityId: data.user.id,
        metadata: { portal: expectedRole, ip, mode: 'supabase' },
        result: 'success',
      })

      return NextResponse.json(
        {
          user: { id: data.user.id, email: normalizedEmail, role: expectedRole },
          authMode: 'supabase',
        },
        { status: 200, headers: NO_STORE_AUTH_HEADERS }
      )
    }

    // 2. Caminho de Demonstração (apenas quando Supabase não está configurado)
    const db = getDemoDatabase()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    )

    if (!user || !verifyDemoPassword(password, user.passwordHash)) {
      await recordAuditLog({
        userId: user?.id ?? null,
        userEmail: normalizedEmail,
        userRole: expectedRole,
        action: 'PORTAL_LOGIN_FAILED',
        entityType: 'auth_portal',
        entityId: expectedRole,
        metadata: { ip, mode: 'demonstration' },
        result: 'failure',
      })
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401, headers: NO_STORE_AUTH_HEADERS }
      )
    }

    if (user.role !== expectedRole) {
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PORTAL_LOGIN_ROLE_MISMATCH',
        entityType: 'auth_portal',
        entityId: expectedRole,
        metadata: {
          expectedRole,
          actualRole: user.role,
          ip,
          mode: 'demonstration',
        },
        result: 'blocked',
      })
      const denied = NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401, headers: NO_STORE_AUTH_HEADERS }
      )
      denied.cookies.set(DEMO_SESSION_COOKIE, '', getAuthCookieOptions(0))
      return denied
    }

    const token = createSignedSessionToken(user.id, expectedRole)
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: expectedRole,
      action: 'PORTAL_LOGIN_SUCCESS',
      entityType: 'user',
      entityId: user.id,
      metadata: { portal: expectedRole, ip, mode: 'demonstration' },
      result: 'success',
    })

    const { passwordHash: _ignored, ...safeUser } = user
    void _ignored
    const response = NextResponse.json(
      {
        user: safeUser,
        authMode: 'demonstration',
      },
      { status: 200, headers: NO_STORE_AUTH_HEADERS }
    )
    response.cookies.set(DEMO_SESSION_COOKIE, token, getAuthCookieOptions())
    return response
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao validar autenticação do portal.' },
      { status: 500, headers: NO_STORE_AUTH_HEADERS }
    )
  }
}
