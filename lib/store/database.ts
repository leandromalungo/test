import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createInitialSeedState, type PlatformDatabaseState } from './seed-data'

/**
 * Repositório de persistência em Modo Demonstração (fallback local para testes unitários
 * e ambiente sem variáveis do Supabase configuradas).
 *
 * Quando `isSupabaseConfigured()` é verdadeiro, as rotas e páginas utilizam
 * exclusivamente o PostgreSQL do Supabase através de `lib/repositories/platform-repository.ts`.
 */

const DB_FILE_PATH = path.join('/tmp', 'nossa-agro-demo-db-v1.json')

const globalForDb = globalThis as unknown as {
  __nossaAgroDb?: PlatformDatabaseState & { policySequence?: number }
}

function computeInitialPolicySeq(policies: PlatformDatabaseState['policies']): number {
  let maxSeq = policies.length
  for (const p of policies) {
    const match = p.policyNumber.match(/-(\d+)$/)
    if (match) {
      const n = Number.parseInt(match[1], 10)
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n
    }
  }
  return maxSeq
}

function loadFromDiskOrSeed(): PlatformDatabaseState & { policySequence?: number } {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as PlatformDatabaseState & {
        policySequence?: number
      }
      if (parsed && Array.isArray(parsed.policies) && Array.isArray(parsed.users)) {
        if (typeof parsed.policySequence !== 'number') {
          parsed.policySequence = computeInitialPolicySeq(parsed.policies)
        }
        return parsed
      }
    }
  } catch {
    // Em caso de ficheiro corrompido, reinicializa com os dados de demonstração.
  }
  const initial: PlatformDatabaseState & { policySequence?: number } =
    createInitialSeedState()
  initial.policySequence = computeInitialPolicySeq(initial.policies)
  persistToDisk(initial)
  return initial
}

function persistToDisk(state: PlatformDatabaseState & { policySequence?: number }) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state), 'utf-8')
  } catch {
    // Em ambientes com filesystem restrito, mantém apenas em memória.
  }
}

export function getDemoDatabase(): PlatformDatabaseState & { policySequence?: number } {
  if (!globalForDb.__nossaAgroDb) {
    globalForDb.__nossaAgroDb = loadFromDiskOrSeed()
  }
  return globalForDb.__nossaAgroDb
}

export function saveDemoDatabase(
  state: PlatformDatabaseState & { policySequence?: number }
): void {
  globalForDb.__nossaAgroDb = state
  persistToDisk(state)
}

export function resetDemoDatabase(): PlatformDatabaseState {
  const fresh: PlatformDatabaseState & { policySequence?: number } =
    createInitialSeedState()
  fresh.policySequence = computeInitialPolicySeq(fresh.policies)
  saveDemoDatabase(fresh)
  return fresh
}

/**
 * Gera número sequencial monotónico de apólice no modo local, evitando colisões após remoções.
 */
export function allocateDemoPolicyNumber(
  db: PlatformDatabaseState & { policySequence?: number },
  year = new Date().getUTCFullYear()
): string {
  const current =
    typeof db.policySequence === 'number'
      ? db.policySequence
      : computeInitialPolicySeq(db.policies)
  const next = current + 1
  db.policySequence = next
  return `NS-AGRO-${year}-${String(next).padStart(4, '0')}`
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function hashDemoPassword(password: string): string {
  if (password === 'Demo@2026') {
    return 'demo-sha256:6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'
  }
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 32).toString('hex')
  return `scrypt:${salt}:${derived}`
}

export function verifyDemoPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('demo-sha256:')) {
    return password === 'Demo@2026'
  }
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, hex] = storedHash.split(':')
    if (!salt || !hex) return false
    const derived = crypto.scryptSync(password, salt, 32).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hex, 'hex'))
  }
  return false
}
