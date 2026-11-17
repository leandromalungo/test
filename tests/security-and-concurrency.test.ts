import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  allocateDemoPolicyNumber,
  getDemoDatabase,
  resetDemoDatabase,
} from '@/lib/store/database'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  timingSafeSecretMatch,
} from '@/lib/security/request-security'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  RepositoryConflictError,
  repoResolveOperationalException,
} from '@/lib/repositories/platform-repository'
import { calculateIndemnity } from '@/services/indemnities/indemnity-engine'

function buildRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ping: true }),
  })
}

describe('Segurança HTTP, CSRF, Content-Type e Comparação Timing-Safe', () => {
  it('bloqueia pedidos com Sec-Fetch-Site=cross-site (403 CSRF)', () => {
    const req = buildRequest('https://agro.nossa.ao/api/farms', {
      host: 'agro.nossa.ao',
      'sec-fetch-site': 'cross-site',
    })
    const res = enforceCsrfProtection(req)
    expect(res?.status).toBe(403)
  })

  it('bloqueia pedidos com Origin divergente do Host (403 CSRF)', () => {
    const req = buildRequest('https://agro.nossa.ao/api/farms', {
      host: 'agro.nossa.ao',
      origin: 'https://atacante.example.com',
    })
    const res = enforceCsrfProtection(req)
    expect(res?.status).toBe(403)
  })

  it('bloqueia pedidos com Referer divergente quando Origin está ausente', () => {
    const req = buildRequest('https://agro.nossa.ao/api/farms', {
      host: 'agro.nossa.ao',
      referer: 'https://phishing.example.com/form',
    })
    const res = enforceCsrfProtection(req)
    expect(res?.status).toBe(403)
  })

  it('aceita pedidos da mesma origem com Origin ou x-forwarded-host correspondente', () => {
    const req = buildRequest('https://agro.nossa.ao/api/farms', {
      'x-forwarded-host': 'agro.nossa.ao',
      origin: 'https://agro.nossa.ao',
      'sec-fetch-site': 'same-origin',
    })
    expect(enforceCsrfProtection(req)).toBeNull()
  })

  it('exige Content-Type application/json em endpoints mutantes (415)', () => {
    const badReq = buildRequest('https://agro.nossa.ao/api/farms', {
      'content-type': 'text/plain',
    })
    expect(enforceJsonContentType(badReq)?.status).toBe(415)

    const okReq = buildRequest('https://agro.nossa.ao/api/farms', {
      'content-type': 'application/json; charset=utf-8',
    })
    expect(enforceJsonContentType(okReq)).toBeNull()
  })

  it('compara segredos de cron em tempo constante mesmo com comprimentos distintos', () => {
    expect(timingSafeSecretMatch('segredo-super-seguro', 'segredo-super-seguro')).toBe(true)
    expect(timingSafeSecretMatch('segredo-super-seguro', 'curto')).toBe(false)
    expect(timingSafeSecretMatch('segredo-super-seguro', 'segredo-super-segurx')).toBe(false)
    expect(timingSafeSecretMatch(undefined, 'segredo-super-seguro')).toBe(false)
    expect(timingSafeSecretMatch('qualquer', '')).toBe(false)
  })
})

describe('Rate Limiting Distribuído (Fallback Local para Testes)', () => {
  it('bloqueia após exceder o limite por chave mantendo outros buckets isolados', async () => {
    const bucketA = `test-bucket-a-${Date.now()}`
    const bucketB = `test-bucket-b-${Date.now()}`

    const r1 = await checkRateLimitDistributed(bucketA, 2, 60_000)
    const r2 = await checkRateLimitDistributed(bucketA, 2, 60_000)
    const r3 = await checkRateLimitDistributed(bucketA, 2, 60_000)
    const otherBucket = await checkRateLimitDistributed(bucketB, 2, 60_000)

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(false)
    expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(otherBucket.allowed).toBe(true)
  })
})

describe('Integridade de Concorrência: Sequência de Apólices e Bloqueio Terminal de Excepções', () => {
  beforeEach(() => {
    resetDemoDatabase()
  })

  it('gera números de apólice estritamente monotónicos mesmo após remoção da última apólice', () => {
    const db = getDemoDatabase()
    const firstNum = allocateDemoPolicyNumber(db, 2026)
    const secondNum = allocateDemoPolicyNumber(db, 2026)

    // Simular eliminação ou alteração da lista de apólices não deve fazer regredir o contador
    db.policies.pop()
    const thirdNum = allocateDemoPolicyNumber(db, 2026)

    expect(firstNum).not.toBe(secondNum)
    expect(secondNum).not.toBe(thirdNum)
    expect(thirdNum > secondNum).toBe(true)
  })

  it('impede dupla decisão ou reabertura de excepção operacional já aprovada/rejeitada', async () => {
    const db = getDemoDatabase()
    const openException = db.exceptions.find(
      (ex) => ex.status === 'open' || ex.status === 'escalated'
    )
    expect(openException).toBeDefined()

    // Primeira decisão: aprovar com leitura validada
    const firstDecision = await repoResolveOperationalException({
      exceptionId: openException!.id,
      decision: 'approve',
      reason: 'Dados validados contra estação meteorológica regional da Huíla.',
      overrideObservedMm: 35,
      operatorUserId: 'usr-operator-01',
      operatorFullName: 'Operador Demo',
      indemnityCalculator: calculateIndemnity,
    })

    expect(firstDecision.exception.status).toBe('approved')

    // Segunda tentativa (concorrente ou reabertura) deve lançar RepositoryConflictError (HTTP 409)
    await expect(
      repoResolveOperationalException({
        exceptionId: openException!.id,
        decision: 'reject',
        reason: 'Tentativa indevida de reversão após encerramento.',
        operatorUserId: 'usr-operator-01',
        operatorFullName: 'Operador Demo',
        indemnityCalculator: calculateIndemnity,
      })
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })
})
