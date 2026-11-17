'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { FormField, TextInput } from '@/components/ui/field'
import type { SystemSettings } from '@/types/domain'

export function SettingsForm({ initial }: { initial: SystemSettings }) {
  const router = useRouter()
  const [disagreement, setDisagreement] = useState(
    String(initial.defaultDisagreementThresholdPercent)
  )
  const [completeness, setCompleteness] = useState(
    String(initial.defaultMinCompletenessPercent)
  )
  const [autoIndemnity, setAutoIndemnity] = useState(initial.autoIndemnityEnabled)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultDisagreementThresholdPercent: Number(disagreement),
        defaultMinCompletenessPercent: Number(completeness),
        autoIndemnityEnabled: autoIndemnity,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Configurações gravadas e registadas na auditoria.')
      router.refresh()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-5 rounded-lg border border-[#E5E7EB] bg-white p-6"
    >
      <FormField
        label="Limiar Máximo Padrão de Discordância entre Fontes (%)"
        htmlFor="set-dis"
      >
        <TextInput
          id="set-dis"
          type="number"
          min="5"
          max="80"
          value={disagreement}
          onChange={(e) => setDisagreement(e.target.value)}
        />
      </FormField>

      <FormField
        label="Cobertura Mínima Padrão de Observações Válidas (%)"
        htmlFor="set-comp"
      >
        <TextInput
          id="set-comp"
          type="number"
          min="50"
          max="100"
          value={completeness}
          onChange={(e) => setCompleteness(e.target.value)}
        />
      </FormField>

      <label className="flex items-center gap-2.5 text-sm text-[#171717] cursor-pointer">
        <input
          type="checkbox"
          checked={autoIndemnity}
          onChange={(e) => setAutoIndemnity(e.target.checked)}
          className="h-4 w-4 accent-[#2563EB]"
        />
        <span>Activar cálculo automático de indemnização quando a qualidade for validada</span>
      </label>

      {msg && (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm text-[#15803D]">
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>Guardar Configurações</span>
      </button>
    </form>
  )
}
