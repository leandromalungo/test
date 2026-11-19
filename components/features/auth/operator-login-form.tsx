'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'

interface OperatorLoginFormProps {
  demonstrationMode: boolean
}

/**
 * Formulário autónomo de autenticação exclusivo para o Portal de Operações & Qualidade.
 * Não partilha componentes, fluxos ou permissões com os portais de Agricultor ou Gestor.
 */
export function OperatorLoginForm({ demonstrationMode }: OperatorLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function authenticateOperator(targetEmail: string, targetPassword: string) {
    const cleanEmail = targetEmail.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Introduza o e-mail técnico do operador.')
      return
    }
    if (targetPassword.length < 8) {
      setError('A palavra-passe técnica deve conter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: targetPassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Autenticação operacional recusada.')
        setLoading(false)
        return
      }
      router.push('/operations')
      router.refresh()
    } catch {
      setError('Erro de ligação ao serviço operacional.')
      setLoading(false)
    }
  }

  function handleOperatorSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void authenticateOperator(email, password)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleOperatorSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="operator-login-email"
            className="block text-[12px] font-medium text-[#171717]"
          >
            E-mail Operacional
          </label>
          <div className="relative">
            <input
              id="operator-login-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="username"
              placeholder="operador@nossa.ao"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 pr-10 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            />
            {emailValid && (
              <Check
                className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#16A34A]"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="operator-login-password"
            className="block text-[12px] font-medium text-[#171717]"
          >
            Palavra-passe Operacional
          </label>
          <div className="relative">
            <input
              id="operator-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={128}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 pr-10 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6B7280] hover:text-[#0D1526]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#6B7280]">
            Acesso restrito para auditoria climática, validação de fontes e resolução de excepções.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? 'A validar credenciais...' : 'Continuar'}</span>
        </button>
      </form>

      {demonstrationMode && (
        <>
          <div className="relative flex items-center justify-center">
            <span className="h-px w-full bg-[#E5E7EB]" aria-hidden="true" />
            <span className="bg-white px-3 text-[11px] font-medium text-[#9CA3AF]">
              Ou
            </span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setEmail('operador@nossa.demo.ao')
              setPassword('Demo@2026')
              void authenticateOperator('operador@nossa.demo.ao', 'Demo@2026')
            }}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-semibold text-[#0D1526] transition-colors hover:border-[#1D4ED8] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
            <span>Entrar com Conta Demo · António Neto</span>
          </button>
        </>
      )}
    </div>
  )
}
