import { NextResponse } from 'next/server'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/server'

/**
 * Endpoint público de verificação de saúde da plataforma e conectividade com o Supabase.
 * Não expõe segredos, chaves nem detalhes internos de infraestrutura.
 */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured()
  const adminConfigured = isSupabaseAdminConfigured()

  let supabaseConnected = false
  let databaseCheck = 'not_configured'

  if (supabaseConfigured && adminConfigured) {
    const admin = createSupabaseAdminClient()
    if (admin) {
      try {
        const { error } = await admin
          .from('system_settings')
          .select('id')
          .limit(1)
        if (!error) {
          supabaseConnected = true
          databaseCheck = 'ok'
        } else {
          databaseCheck = 'error'
        }
      } catch {
        databaseCheck = 'unreachable'
      }
    }
  }

  const storageMode = supabaseConfigured ? 'supabase' : 'demonstration'
  const ok = !supabaseConfigured || (adminConfigured && supabaseConnected)

  return NextResponse.json(
    {
      ok,
      service: 'nossa-agroparametrico',
      storageMode,
      supabaseConfigured,
      supabaseAdminConfigured: adminConfigured,
      supabaseConnected,
      databaseCheck,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: NO_STORE_SECURITY_HEADERS,
    }
  )
}
