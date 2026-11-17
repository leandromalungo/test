'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-medium text-[#B45309]">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Acesso exclusivo para Operadores de Qualidade e Tratamento de Excepções</span>
      </div>

      <form onSubmit={handleOperatorSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="operator-login-email"
            className="block text-sm font-medium text-[#171717]"
          >
            E-mail Operacional
          </label>
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
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="operator-login-password"
            className="block text-sm font-medium text-[#171717]"
          >
            Palavra-passe
          </label>
          <input
            id="operator-login-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#B45309] px-4 text-sm font-medium text-white transition-colors hover:bg-[#92400E] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? 'A validar credenciais...' : 'Aceder às Operações'}</span>
        </button>
      </form>

      {demonstrationMode && (
        <div className="border-t border-[#E5E7EB] pt-5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#737373]">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Conta de Demonstração (Operador)</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setEmail('operador@nossa.demo.ao')
              setPassword('Demo@2026')
              void authenticateOperator('operador@nossa.demo.ao', 'Demo@2026')
            }}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-left transition-colors hover:border-[#D97706] hover:bg-white disabled:opacity-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#171717]">
                António Sebastião Neto
              </p>
              <p className="truncate font-mono text-xs text-[#737373]">
                operador@nossa.demo.ao · Demo@2026
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#B45309]">
              Entrar
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
