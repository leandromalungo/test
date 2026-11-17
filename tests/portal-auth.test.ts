import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { resetDemoDatabase } from '@/lib/store/database'
import { authenticateForPortal } from '@/lib/auth/portal-auth'
import {
  createSignedSessionToken,
  verifySignedSessionToken,
} from '@/lib/auth/session'
import { loginSchema } from '@/lib/validation/schemas'

function makeLoginRequest(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('Isolamento de Autenticação e Segurança por Portal', () => {
  beforeEach(() => {
    resetDemoDatabase()
  })

  it('rejeita campos extra injectados no payload de login (Zod .strict)', () => {
    const parsed = loginSchema.safeParse({
      email: 'agricultor@nossa.demo.ao',
      password: 'Demo@2026',
      role: 'manager',
    })
    expect(parsed.success).toBe(false)
  })

  it('vincula tokens HMAC assinados ao respectivo papel e detecta adulteração', () => {
    const token = createSignedSessionToken('usr-farmer-01', 'farmer')
    const verified = verifySignedSessionToken(token)
    expect(verified).toEqual({
      uid: 'usr-farmer-01',
      role: 'farmer',
      portal: 'farmer',
    })

    // Adulteração da assinatura é rejeitada
    const tampered = `${token.slice(0, -4)}XXXX`
    expect(verifySignedSessionToken(tampered)).toBeNull()
  })

  it('impede cruzamento de perfis entre as três telas/endpoints de login', async () => {
    // Agricultor não pode autenticar-se nos endpoints de Gestor ou Operador
    const farmerOnManager = await authenticateForPortal(
      makeLoginRequest('http://localhost:3000/api/auth/manager/login', {
        email: 'agricultor@nossa.demo.ao',
        password: 'Demo@2026',
      }),
      'manager'
    )
    expect(farmerOnManager.status).toBe(401)
    expect(farmerOnManager.cookies.get('nossa_agro_session')?.value || '').toBe('')

    const farmerOnOperator = await authenticateForPortal(
      makeLoginRequest('http://localhost:3000/api/auth/operator/login', {
        email: 'agricultor@nossa.demo.ao',
        password: 'Demo@2026',
      }),
      'operator'
    )
    expect(farmerOnOperator.status).toBe(401)

    // Gestor não pode autenticar-se nos endpoints de Agricultor ou Operador
    const managerOnFarmer = await authenticateForPortal(
      makeLoginRequest('http://localhost:3000/api/auth/farmer/login', {
        email: 'gestor@nossa.demo.ao',
        password: 'Demo@2026',
      }),
      'farmer'
    )
    expect(managerOnFarmer.status).toBe(401)

    // Operador não pode autenticar-se no endpoint de Gestor
    const operatorOnManager = await authenticateForPortal(
      makeLoginRequest('http://localhost:3000/api/auth/manager/login', {
        email: 'operador@nossa.demo.ao',
        password: 'Demo@2026',
      }),
      'manager'
    )
    expect(operatorOnManager.status).toBe(401)
  })

  it('permite autenticação quando conta e endpoint correspondem ao mesmo perfil', async () => {
    const res = await authenticateForPortal(
      makeLoginRequest('http://localhost:3000/api/auth/manager/login', {
        email: 'gestor@nossa.demo.ao',
        password: 'Demo@2026',
      }),
      'manager'
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('no-store')
    const cookieVal = res.cookies.get('nossa_agro_session')?.value
    expect(cookieVal).toBeTruthy()
    expect(verifySignedSessionToken(cookieVal!)?.role).toBe('manager')
  })

  it('bloqueia pedidos cross-origin (protecção CSRF) e força bruta por conta', async () => {
    const csrfRes = await authenticateForPortal(
      makeLoginRequest(
        'http://localhost:3000/api/auth/manager/login',
        { email: 'gestor@nossa.demo.ao', password: 'Demo@2026' },
        { origin: 'https://evil.example.com' }
      ),
      'manager'
    )
    expect(csrfRes.status).toBe(403)

    // 5 falhas no portal de operador bloqueiam a 6.ª tentativa (429)
    for (let i = 0; i < 5; i++) {
      const fail = await authenticateForPortal(
        makeLoginRequest(
          'http://localhost:3000/api/auth/operator/login',
          { email: 'bruteforce.test@nossa.ao', password: 'WrongPassword123' },
          { 'x-forwarded-for': `10.0.0.${i + 1}` }
        ),
        'operator'
      )
      expect(fail.status).toBe(401)
    }

    const locked = await authenticateForPortal(
      makeLoginRequest(
        'http://localhost:3000/api/auth/operator/login',
        { email: 'bruteforce.test@nossa.ao', password: 'WrongPassword123' },
        { 'x-forwarded-for': '10.0.0.99' }
      ),
      'operator'
    )
    expect(locked.status).toBe(429)
  })
})
