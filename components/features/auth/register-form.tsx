'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { ANGOLA_PROVINCES } from '@/config/angola'

/**
 * Formulário autónomo de registo de novo agricultor para o mercado angolano.
 */
export function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '+244 ',
    nif: '',
    province: 'Huambo',
    municipality: '',
    farmerCategory: 'smallholder',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValid = form.fullName.trim().length >= 3
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível concluir o registo.')
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de ligação ao servidor.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-phone"
            className="block text-[12px] font-medium text-[#171717]"
          >
            Número de telefone
          </label>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 focus-within:border-[#1D4ED8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1D4ED8]/15">
            <span className="inline-flex shrink-0 items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0D1526] shadow-2xs">
              AO
            </span>
            <input
              id="reg-phone"
              required
              placeholder="+244 923 000 000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-transparent text-sm text-[#0D1526] placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="reg-name"
              className="block text-[12px] font-medium text-[#171717]"
            >
              Nome Completo
            </label>
            <div className="relative">
              <input
                id="reg-name"
                required
                placeholder="Domingas Katchiungo"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 pr-9 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
              />
              {nameValid && (
                <Check
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#16A34A]"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reg-email"
              className="block text-[12px] font-medium text-[#171717]"
            >
              E-mail
            </label>
            <div className="relative">
              <input
                id="reg-email"
                type="email"
                required
                placeholder="produtor@exemplo.ao"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 pr-9 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
              />
              {emailValid && (
                <Check
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#16A34A]"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="reg-nif"
              className="block text-[12px] font-medium text-[#171717]"
            >
              NIF Angolano
            </label>
            <input
              id="reg-nif"
              required
              placeholder="004512389HO041"
              value={form.nif}
              onChange={(e) => setForm({ ...form, nif: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reg-cat"
              className="block text-[12px] font-medium text-[#171717]"
            >
              Tipologia
            </label>
            <select
              id="reg-cat"
              value={form.farmerCategory}
              onChange={(e) => setForm({ ...form, farmerCategory: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 text-sm text-[#0D1526] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            >
              <option value="smallholder">Pequeno Produtor</option>
              <option value="medium_producer">Médio Produtor</option>
              <option value="cooperative">Cooperativa Agrícola</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="reg-province"
              className="block text-[12px] font-medium text-[#171717]"
            >
              Província
            </label>
            <select
              id="reg-province"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 text-sm text-[#0D1526] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            >
              {ANGOLA_PROVINCES.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reg-municipality"
              className="block text-[12px] font-medium text-[#171717]"
            >
              Município
            </label>
            <input
              id="reg-municipality"
              required
              placeholder="Ex.: Caála"
              value={form.municipality}
              onChange={(e) => setForm({ ...form, municipality: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-transparent bg-[#F4F5F7] px-3.5 text-sm text-[#0D1526] placeholder:text-[#9CA3AF] transition-colors focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-password"
            className="block text-[12px] font-medium text-[#171717]"
          >
            Palavra-passe
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={128}
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
            Mínimo de 8 caracteres. Utilize letras maiúsculas, minúsculas e números.
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
          <span>{loading ? 'A criar conta...' : 'Continuar'}</span>
        </button>
      </form>

      <p className="text-center text-xs text-[#6B7280]">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-[#1D4ED8] hover:underline">
          Iniciar sessão
        </Link>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-[#6B7280]">
        Ao registar-se confirma que leu e concorda com os nossos{' '}
        <Link href="/terms" className="font-medium text-[#1D4ED8] hover:underline">
          Termos de Serviço
        </Link>{' '}
        e{' '}
        <Link href="/privacy" className="font-medium text-[#1D4ED8] hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  )
}
