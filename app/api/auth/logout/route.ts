import { NextRequest, NextResponse } from 'next/server'
import {
  DEMO_SESSION_COOKIE,
  getAuthCookieOptions,
  NO_STORE_AUTH_HEADERS,
} from '@/lib/auth/session'
import { enforceCsrfProtection } from '@/lib/security/request-security'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * POST /api/auth/logout
 * Termina a sessão actual, valida origem e remove o cookie HttpOnly de sessão.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: NO_STORE_AUTH_HEADERS }
  )
  response.cookies.set(DEMO_SESSION_COOKIE, '', getAuthCookieOptions(0))
  return response
}
