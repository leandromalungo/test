import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cabeçalhos de segurança padrão para respostas da API com dados sensíveis.
 */
export const NO_STORE_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

/**
 * Extrai o endereço IP de origem do cliente a partir dos cabeçalhos de proxy.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'local'
  )
}

/**
 * Valida que pedidos mutantes (POST/PATCH/PUT/DELETE) provêm da mesma origem (protecção CSRF).
 *
 * Regras aplicadas:
 * 1. Bloqueia imediatamente se `Sec-Fetch-Site` indicar `cross-site`.
 * 2. Se o cabeçalho `Origin` existir, exige correspondência exacta com `X-Forwarded-Host` ou `Host`.
 * 3. Se `Origin` estiver ausente mas `Referer` existir, exige correspondência de host no `Referer`.
 */
export function verifySameOrigin(req: NextRequest): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site')?.toLowerCase()
  if (secFetchSite === 'cross-site') {
    return false
  }

  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const host = hostHeader?.split(',')[0]?.trim()

  const origin = req.headers.get('origin')
  if (origin) {
    if (!host) return false
    try {
      const parsedOrigin = new URL(origin)
      return parsedOrigin.host === host
    } catch {
      return false
    }
  }

  const referer = req.headers.get('referer')
  if (referer) {
    if (!host) return false
    try {
      const parsedReferer = new URL(referer)
      return parsedReferer.host === host
    } catch {
      return false
    }
  }

  // Pedidos server-to-server (ex.: Cron autenticado ou testes) sem Origin/Referer
  return true
}

/**
 * Devolve resposta 403 pronta a retornar caso a verificação CSRF de mesma origem falhe.
 */
export function enforceCsrfProtection(req: NextRequest): NextResponse | null {
  if (!verifySameOrigin(req)) {
    return NextResponse.json(
      { error: 'Origem do pedido não autorizada (protecção CSRF).' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
  return null
}

/**
 * Exige `Content-Type: application/json` em pedidos mutantes com payload JSON.
 */
export function enforceJsonContentType(req: NextRequest): NextResponse | null {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json(
      { error: 'Formato de pedido inválido. Utilize application/json.' },
      { status: 415, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
  return null
}

/**
 * Compara dois segredos em tempo constante (`crypto.timingSafeEqual` sobre hash SHA-256),
 * prevenindo ataques de temporização mesmo quando os comprimentos diferem.
 */
export function timingSafeSecretMatch(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false
  const digestA = crypto.createHash('sha256').update(provided, 'utf8').digest()
  const digestB = crypto.createHash('sha256').update(expected, 'utf8').digest()
  return crypto.timingSafeEqual(digestA, digestB)
}
