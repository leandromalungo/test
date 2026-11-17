import { createBrowserClient } from '@supabase/ssr'

/**
 * Indica se as variáveis públicas do Supabase estão configuradas no ambiente.
 * Quando ausentes, a aplicação opera em Modo Demonstração documentado.
 */
export function isSupabasePublicConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  if (!url || !anonKey) return false
  if (url.includes('seu-projeto') || anonKey.includes('sua-chave')) return false
  return url.startsWith('https://') || url.startsWith('http://localhost')
}

/**
 * Cria o cliente Supabase para componentes Client-Side (apenas quando configurado).
 */
export function createSupabaseBrowserClient() {
  if (!isSupabasePublicConfigured()) {
    return null
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
