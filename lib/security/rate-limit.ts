import { createSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * Limitador de taxa e bloqueio anti-força-bruta distribuídos.
 *
 * Em Produção (Supabase configurado): utiliza a função atómica PostgreSQL
 * `public.check_and_increment_rate_limit`, partilhada entre todas as instâncias
 * serverless e resistente a reinícios do servidor.
 *
 * Em Modo Demonstração/Testes (sem credenciais Supabase): utiliza armazenamento
 * em memória como fallback para testes unitários e pré-visualização local.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitEntry>
}

const store = globalForRateLimit.__rateLimitStore ?? new Map<string, RateLimitEntry>()
globalForRateLimit.__rateLimitStore = store

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  backend: 'supabase_postgres' | 'memory_fallback'
}

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now - existing.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: 0,
      backend: 'memory_fallback',
    }
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - existing.windowStart)) / 1000)
    )
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      backend: 'memory_fallback',
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: 0,
    backend: 'memory_fallback',
  }
}

/**
 * Verifica e incrementa o limitador de taxa de forma distribuída via PostgreSQL (Supabase RPC).
 * Caso o Supabase ainda não esteja configurado no ambiente local/testes, recorre ao store em memória.
 */
export async function checkRateLimitDistributed(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return checkRateLimit(key, maxRequests, windowMs)
  }

  try {
    const { data, error } = await admin.rpc('check_and_increment_rate_limit', {
      p_bucket_key: key,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    })

    if (!error && Array.isArray(data) && data[0]) {
      const row = data[0] as {
        allowed: boolean
        remaining: number
        retry_after_seconds: number
      }
      return {
        allowed: Boolean(row.allowed),
        remaining: Number(row.remaining ?? 0),
        retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
        backend: 'supabase_postgres',
      }
    }
  } catch (err) {
    console.warn('[RateLimit] Falha transitória na RPC distribuída; a aplicar fallback local:', err)
  }

  return checkRateLimit(key, maxRequests, windowMs)
}
