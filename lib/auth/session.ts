import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { getDemoDatabase } from '@/lib/store/database'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import type { CustomerRecord, UserProfile, UserRole } from '@/types/domain'

/**
 * Gestão de sessão e controlo de acesso baseado em papéis (RBAC) no servidor.
 *
 * - Quando o Supabase está configurado (`isSupabaseConfigured()`), confia EXCLUSIVAMENTE
 *   na sessão autenticada do Supabase Auth + tabelas `profiles`, `user_roles` e `customers`.
 * - Quando o Supabase ainda não está configurado (Modo Demonstração / Testes),
 *   utiliza cookies HttpOnly assinados com HMAC-SHA256 vinculados ao papel e portal.
 */

export const DEMO_SESSION_COOKIE = 'nossa_agro_session'

/**
 * Cabeçalhos de segurança obrigatórios para respostas de autenticação e sessão.
 */
export const NO_STORE_AUTH_HEADERS: Record<string, string> = NO_STORE_SECURITY_HEADERS

export function getAuthCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim() || ''
  if (configured.length >= 32) {
    return configured
  }
  if (configured.length >= 16 && process.env.NODE_ENV !== 'production') {
    return configured
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET obrigatória em produção (mínimo 32 caracteres aleatórios).'
    )
  }
  const g = globalThis as unknown as { __nossaSessionSecret?: string }
  if (!g.__nossaSessionSecret) {
    g.__nossaSessionSecret = crypto
      .createHash('sha256')
      .update(`nossa-agro-local-${process.cwd()}`)
      .digest('hex')
  }
  return g.__nossaSessionSecret
}

function signPayload(payloadBase64: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadBase64)
    .digest('base64url')
}

interface SignedSessionPayload {
  uid: string
  role: UserRole
  portal: UserRole
  jti: string
  iat: number
  exp: number
}

export function createSignedSessionToken(userId: string, role: UserRole): string {
  const now = Date.now()
  const payload: SignedSessionPayload = {
    uid: userId,
    role,
    portal: role,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + 1000 * 60 * 60 * 24 * 7, // 7 dias
  }
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url')
  const sig = signPayload(encoded)
  return `${encoded}.${sig}`
}

export function verifySignedSessionToken(
  token: string
): { uid: string; role: UserRole; portal: UserRole } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [encoded, sig] = parts
    if (!encoded || !sig) return null

    const expectedSig = signPayload(encoded)
    const sigBuf = Buffer.from(sig, 'utf-8')
    const expectedBuf = Buffer.from(expectedSig, 'utf-8')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as Partial<SignedSessionPayload>

    if (
      !decoded.uid ||
      !decoded.role ||
      !decoded.portal ||
      !decoded.jti ||
      decoded.role !== decoded.portal ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null
    }
    return { uid: decoded.uid, role: decoded.role, portal: decoded.portal }
  } catch {
    return null
  }
}

export interface AuthenticatedContext {
  user: UserProfile
  customer: CustomerRecord | null
  authMode: 'supabase' | 'demonstration'
}

/**
 * Obtém o utilizador autenticado a partir da sessão Supabase ou do cookie assinado de demonstração.
 */
export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return null

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const [{ data: profile }, { data: roleRow }, { data: customerRow }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
        supabase.from('customers').select('*').eq('user_id', user.id).maybeSingle(),
      ])

    const role = (roleRow?.role as UserRole) || 'farmer'
    return {
      user: {
        id: user.id,
        email: user.email || '',
        fullName: profile?.full_name || user.email || 'Utilizador',
        phone: profile?.phone || '',
        nif: profile?.nif || '',
        province: profile?.province || 'Huambo',
        municipality: profile?.municipality || '',
        role,
        createdAt: profile?.created_at || new Date().toISOString(),
      },
      customer: customerRow
        ? {
            id: customerRow.id,
            userId: customerRow.user_id,
            fullName: customerRow.full_name,
            email: customerRow.email,
            phone: customerRow.phone,
            nif: customerRow.nif,
            province: customerRow.province,
            municipality: customerRow.municipality,
            farmerCategory: customerRow.farmer_category,
            kycStatus: customerRow.kyc_status,
            createdAt: customerRow.created_at,
          }
        : null,
      authMode: 'supabase',
    }
  }

  const cookieStore = await cookies()
  const rawToken = cookieStore.get(DEMO_SESSION_COOKIE)?.value
  if (!rawToken) return null

  const verified = verifySignedSessionToken(rawToken)
  if (!verified) return null

  const db = getDemoDatabase()
  const user = db.users.find((u) => u.id === verified.uid)
  if (!user || user.role !== verified.role) return null

  const customer = db.customers.find((c) => c.userId === user.id) ?? null
  const { passwordHash: _ignored, ...safeProfile } = user
  void _ignored
  return {
    user: safeProfile,
    customer,
    authMode: 'demonstration',
  }
}

/**
 * Exige autenticação e valida que o utilizador possui um dos papéis autorizados.
 * Devolve resposta HTTP 401/403 pronta a retornar em Route Handlers caso falhe.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; response: NextResponse }
> {
  const context = await getAuthenticatedContext()
  if (!context) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Autenticação necessária para aceder a este recurso.' },
        { status: 401, headers: NO_STORE_AUTH_HEADERS }
      ),
    }
  }

  if (!allowedRoles.includes(context.user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Acesso interdito para o perfil "${context.user.role}". Permissão insuficiente.`,
        },
        { status: 403, headers: NO_STORE_AUTH_HEADERS }
      ),
    }
  }

  return { ok: true, context }
}
