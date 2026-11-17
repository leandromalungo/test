'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Loader2, Sprout } from 'lucide-react'

interface FarmerLoginFormProps {
  demonstrationMode: boolean
}

/**
 * Formulário autónomo de autenticação exclusivo para o Portal do Agricultor.
 * Não partilha componentes, estado ou endpoints com os portais internos da seguradora.
 */
export function FarmerLoginForm({ demonstrationMode }: FarmerLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function authenticateFarmer(targetEmail: string, targetPassword: string) {
    const cleanEmail = targetEmail.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Introduza um endereço de e-mail válido.')
      return
    }
    if (targetPassword.length < 8) {
      setError('A palavra-passe deve conter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/farmer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: targetPassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Não foi possível validar o acesso do agricultor.')
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de comunicação ao validar sessão do agricultor.')
      setLoading(false)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void authenticateFarmer(email, password)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#15803D]">
        <Sprout className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Acesso exclusivo para produtores rurais e cooperativas seguradas</span>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="farmer-login-email"
            className="block text-sm font-medium text-[#171717]"
          >
            E-mail do Produtor
          </label>
          <input
            id="farmer-login-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="agricultor@exemplo.ao"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="farmer-login-password"
            className="block text-sm font-medium text-[#171717]"
          >
            Palavra-passe
          </label>
          <input
            id="farmer-login-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? 'A validar acesso...' : 'Entrar no Portal do Agricultor'}</span>
        </button>
      </form>

      {demonstrationMode && (
        <div className="border-t border-[#E5E7EB] pt-5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#737373]">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Conta de Demonstração (Agricultor)</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setEmail('agricultor@nossa.demo.ao')
              setPassword('Demo@2026')
              void authenticateFarmer('agricultor@nossa.demo.ao', 'Demo@2026')
            }}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5 text-left transition-colors hover:border-[#2563EB] hover:bg-white disabled:opacity-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#171717]">
                Mateus Kiala Domingos (Huambo)
              </p>
              <p className="truncate font-mono text-xs text-[#737373]">
                agricultor@nossa.demo.ao · Demo@2026
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#2563EB]">
              Entrar
            </span>
          </button>
        </div>
      )}

      <p className="text-center text-sm text-[#737373]">
        Ainda não tem conta de produtor?{' '}
        <Link href="/register" className="font-medium text-[#2563EB] hover:underline">
          Registar agricultor
        </Link>
      </p>
    </div>
  )
}
