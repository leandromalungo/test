'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, KeyRound, Loader2 } from 'lucide-react'

interface ManagerLoginFormProps {
  demonstrationMode: boolean
}

/**
 * Formulário autónomo de autenticação exclusivo para o Portal de Gestão (NOSSA Seguros).
 * Não partilha componentes de UI, rotas de API ou credenciais com outros perfis.
 */
export function ManagerLoginForm({ demonstrationMode }: ManagerLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function authenticateManager(targetEmail: string, targetPassword: string) {
    const cleanEmail = targetEmail.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Introduza o e-mail corporativo do gestor.')
      return
    }
    if (targetPassword.length < 8) {
      setError('A palavra-passe corporativa deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/manager/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: targetPassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Acesso recusado no portal executivo.')
        setLoading(false)
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Falha de rede ao contactar o serviço de autenticação.')
      setLoading(false)
    }
  }

  function handleManagerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void authenticateManager(email, password)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-medium text-[#1D4ED8]">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Acesso restrito à Direcção de Gestão e Subscrição · NOSSA Seguros</span>
      </div>

      <form onSubmit={handleManagerSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="manager-login-email"
            className="block text-sm font-medium text-[#171717]"
          >
            E-mail Corporativo (Gestor)
          </label>
          <input
            id="manager-login-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="username"
            placeholder="gestor@nossa.ao"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/15"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="manager-login-password"
            className="block text-sm font-medium text-[#171717]"
          >
            Palavra-passe
          </label>
          <input
            id="manager-login-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/15"
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
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? 'A autenticar gestor...' : 'Aceder à Gestão Executiva'}</span>
        </button>
      </form>

      {demonstrationMode && (
        <div className="border-t border-[#E5E7EB] pt-5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#737373]">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Conta de Demonstração (Gestor)</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setEmail('gestor@nossa.demo.ao')
              setPassword('Demo@2026')
              void authenticateManager('gestor@nossa.demo.ao', 'Demo@2026')
            }}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-left transition-colors hover:border-[#171717] hover:bg-white disabled:opacity-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#171717]">
                Eng.ª Carla Beatriz Tavares
              </p>
              <p className="truncate font-mono text-xs text-[#737373]">
                gestor@nossa.demo.ao · Demo@2026
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#171717]">
              Entrar
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
