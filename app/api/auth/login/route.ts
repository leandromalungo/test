import { NextResponse } from 'next/server'
import { NO_STORE_AUTH_HEADERS } from '@/lib/auth/session'

/**
 * POST /api/auth/login
 * Endpoint unificado desactivado por segurança de isolamento entre portais.
 * Cada perfil deve autenticar-se exclusivamente através do seu endpoint dedicado.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Autenticação unificada desactivada. Utilize a tela e o endpoint dedicados do respectivo portal.',
    },
    { status: 403, headers: NO_STORE_AUTH_HEADERS }
  )
}
