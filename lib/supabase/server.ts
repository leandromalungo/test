import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function hasValidSupabaseValue(value: string | undefined): boolean {
  const trimmed = value?.trim() || ''
  if (!trimmed) return false
  if (
    trimmed.includes('seu-projeto') ||
    trimmed.includes('sua-chave') ||
    trimmed.includes('altere-para')
  ) {
    return false
  }
  return true
}

/**
 * Verifica se o ambiente possui credenciais públicas válidas do Supabase.
 * Quando verdadeiro, a aplicação opera ligada directamente ao PostgreSQL do Supabase.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  if (!hasValidSupabaseValue(url) || !hasValidSupabaseValue(anonKey)) {
    return false
  }
  return url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
}

/**
 * Verifica se a chave privilegiada (`SUPABASE_SERVICE_ROLE_KEY`) está configurada no servidor.
 */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && hasValidSupabaseValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Cria o cliente Supabase para Server Components e API Route Handlers respeitando cookies SSR e RLS.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Em Server Components de leitura pura, a escrita de cookies pode ser ignorada.
          }
        },
      },
    }
  )
}

/**
 * Cria cliente administrativo com Service Role Key EXCLUSIVAMENTE no servidor.
 * Nunca importar este módulo em componentes client-side ('use client').
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Garante acesso ao cliente administrativo quando o Supabase está activado,
 * evitando degradação silenciosa para persistência temporária.
 */
export function requireSupabaseAdminClient(): SupabaseClient {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente ou inválida. Configure a chave secreta do servidor em .env.local para persistir dados no PostgreSQL.'
    )
  }
  return admin
}
