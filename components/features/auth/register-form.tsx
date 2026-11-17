'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'

/**
 * Formulário de registo de novo agricultor para o mercado angolano.
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome Completo ou Cooperativa" htmlFor="reg-name">
        <TextInput
          id="reg-name"
          required
          placeholder="Ex.: Domingas Katchiungo"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="E-mail" htmlFor="reg-email">
          <TextInput
            id="reg-email"
            type="email"
            required
            placeholder="produtor@exemplo.ao"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FormField>
        <FormField label="Telefone (+244)" htmlFor="reg-phone">
          <TextInput
            id="reg-phone"
            required
            placeholder="+244 923 000 000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="NIF Angolano" htmlFor="reg-nif">
          <TextInput
            id="reg-nif"
            required
            placeholder="004512389HO041"
            value={form.nif}
            onChange={(e) => setForm({ ...form, nif: e.target.value })}
          />
        </FormField>
        <FormField label="Tipologia de Produtor" htmlFor="reg-cat">
          <SelectInput
            id="reg-cat"
            value={form.farmerCategory}
            onChange={(e) => setForm({ ...form, farmerCategory: e.target.value })}
          >
            <option value="smallholder">Pequeno Produtor</option>
            <option value="medium_producer">Médio Produtor</option>
            <option value="cooperative">Cooperativa Agrícola</option>
          </SelectInput>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Província" htmlFor="reg-province">
          <SelectInput
            id="reg-province"
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          >
            {ANGOLA_PROVINCES.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Município" htmlFor="reg-municipality">
          <TextInput
            id="reg-municipality"
            required
            placeholder="Ex.: Caála"
            value={form.municipality}
            onChange={(e) => setForm({ ...form, municipality: e.target.value })}
          />
        </FormField>
      </div>

      <FormField
        label="Palavra-passe"
        htmlFor="reg-password"
        hint="Mínimo de 8 caracteres."
      >
        <TextInput
          id="reg-password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </FormField>

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
        <span>{loading ? 'A criar conta...' : 'Criar Conta de Agricultor'}</span>
      </button>

      <p className="text-center text-sm text-[#737373]">
        Já possui conta?{' '}
        <Link href="/login" className="font-medium text-[#2563EB] hover:underline">
          Iniciar sessão
        </Link>
      </p>
    </form>
  )
}
