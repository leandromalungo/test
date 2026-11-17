'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'
import type { UserProfile } from '@/types/domain'

export function ProfileForm({ user }: { user: UserProfile }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone)
  const [province, setProvince] = useState(user.province)
  const [municipality, setMunicipality] = useState(user.municipality)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, province, municipality }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao actualizar perfil.')
      } else {
        setMessage('Dados pessoais actualizados com sucesso.')
        router.refresh()
      }
    } catch {
      setError('Falha de rede ao actualizar perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-6"
    >
      <FormField label="Nome Completo" htmlFor="prof-name">
        <TextInput
          id="prof-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="E-mail (Identificador)" htmlFor="prof-email">
          <TextInput id="prof-email" value={user.email} disabled />
        </FormField>
        <FormField label="NIF" htmlFor="prof-nif">
          <TextInput id="prof-nif" value={user.nif} disabled />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Telefone" htmlFor="prof-phone">
          <TextInput
            id="prof-phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>
        <FormField label="Província" htmlFor="prof-prov">
          <SelectInput
            id="prof-prov"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            {ANGOLA_PROVINCES.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
      </div>

      <FormField label="Município" htmlFor="prof-mun">
        <TextInput
          id="prof-mun"
          required
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
        />
      </FormField>

      {message && (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm text-[#15803D]">
          {message}
        </div>
      )}
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
        disabled={saving}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{saving ? 'A guardar...' : 'Guardar Alterações'}</span>
      </button>
    </form>
  )
}
