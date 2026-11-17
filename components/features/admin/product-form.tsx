'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { FormField, SelectInput, TextInput, TextareaInput } from '@/components/ui/field'
import type { CropType } from '@/types/domain'

export function ProductForm({ crops }: { crops: CropType[] }) {
  const router = useRouter()
  const [code, setCode] = useState('AGRO-SECA-40D')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverageType, setCoverageType] = useState<'drought' | 'excess_rain'>('drought')
  const [selectedCrops, setSelectedCrops] = useState<string[]>(crops.map((c) => c.id))
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(['Huambo', 'Huíla', 'Benguela'])
  const [minCapitalAoa, setMinCapitalAoa] = useState('150000')
  const [maxCapitalAoa, setMaxCapitalAoa] = useState('20000000')
  const [basePremiumRate, setBasePremiumRate] = useState('0.065')
  const [minPremiumAoa, setMinPremiumAoa] = useState('12000')
  const [triggerThresholdMm, setTriggerThresholdMm] = useState('100')
  const [observationWindowDays, setObservationWindowDays] = useState('30')
  const [maxDisagreement, setMaxDisagreement] = useState('25')
  const [minCompleteness, setMinCompleteness] = useState('85')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCrop(id: string) {
    setSelectedCrops((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleProvince(nameVal: string) {
    setSelectedProvinces((prev) =>
      prev.includes(nameVal) ? prev.filter((x) => x !== nameVal) : [...prev, nameVal]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          description,
          coverageType,
          supportedCropIds: selectedCrops,
          supportedProvinces: selectedProvinces,
          minCapitalAoa: Number(minCapitalAoa),
          maxCapitalAoa: Number(maxCapitalAoa),
          basePremiumRate: Number(basePremiumRate),
          minPremiumAoa: Number(minPremiumAoa),
          triggerThresholdMm: Number(triggerThresholdMm),
          observationWindowDays: Number(observationWindowDays),
          maxSourceDisagreementPercent: Number(maxDisagreement),
          minDataCompletenessPercent: Number(minCompleteness),
          severityBands: [
            { id: 'b0', label: 'Dentro do intervalo normal', minDeviationPercent: 0, maxDeviationPercent: 10, payoutPercentage: 0 },
            { id: 'b1', label: 'Desvio moderado', minDeviationPercent: 10, maxDeviationPercent: 25, payoutPercentage: 25 },
            { id: 'b2', label: 'Desvio significativo', minDeviationPercent: 25, maxDeviationPercent: 45, payoutPercentage: 50 },
            { id: 'b3', label: 'Desvio severo', minDeviationPercent: 45, maxDeviationPercent: 65, payoutPercentage: 75 },
            { id: 'b4', label: 'Desvio extremo', minDeviationPercent: 65, maxDeviationPercent: null, payoutPercentage: 100 },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar produto.')
        setSubmitting(false)
        return
      }
      router.push('/admin/products')
      router.refresh()
    } catch {
      setError('Erro de comunicação ao gravar produto.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Código do Produto" htmlFor="p-code">
          <TextInput id="p-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </FormField>
        <FormField label="Tipo de Risco Climático" htmlFor="p-cov">
          <SelectInput
            id="p-cov"
            value={coverageType}
            onChange={(e) => setCoverageType(e.target.value as 'drought' | 'excess_rain')}
          >
            <option value="drought">Seca (Défice Hídrico)</option>
            <option value="excess_rain">Excesso Pluviométrico</option>
          </SelectInput>
        </FormField>
      </div>

      <FormField label="Designação Comercial" htmlFor="p-name">
        <TextInput
          id="p-name"
          required
          placeholder="Ex.: Protecção Milho Planalto 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <FormField label="Descrição das Regras de Cobertura" htmlFor="p-desc">
        <TextareaInput
          id="p-desc"
          required
          placeholder="Descreva o risco coberto, janela fenológica e condições gerais..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-4">
        <FormField label="Gatilho (mm)" htmlFor="p-trig">
          <TextInput id="p-trig" type="number" required value={triggerThresholdMm} onChange={(e) => setTriggerThresholdMm(e.target.value)} />
        </FormField>
        <FormField label="Janela (dias)" htmlFor="p-win">
          <TextInput id="p-win" type="number" required value={observationWindowDays} onChange={(e) => setObservationWindowDays(e.target.value)} />
        </FormField>
        <FormField label="Taxa Base (decimal)" htmlFor="p-rate" hint="Ex.: 0.065 = 6.5%">
          <TextInput id="p-rate" type="number" step="0.001" required value={basePremiumRate} onChange={(e) => setBasePremiumRate(e.target.value)} />
        </FormField>
        <FormField label="Prémio Mínimo (AOA)" htmlFor="p-minp">
          <TextInput id="p-minp" type="number" required value={minPremiumAoa} onChange={(e) => setMinPremiumAoa(e.target.value)} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <FormField label="Capital Mínimo (AOA)" htmlFor="p-minc">
          <TextInput id="p-minc" type="number" required value={minCapitalAoa} onChange={(e) => setMinCapitalAoa(e.target.value)} />
        </FormField>
        <FormField label="Capital Máximo (AOA)" htmlFor="p-maxc">
          <TextInput id="p-maxc" type="number" required value={maxCapitalAoa} onChange={(e) => setMaxCapitalAoa(e.target.value)} />
        </FormField>
        <FormField label="Completude Mínima (%)" htmlFor="p-comp">
          <TextInput id="p-comp" type="number" required value={minCompleteness} onChange={(e) => setMinCompleteness(e.target.value)} />
        </FormField>
        <FormField label="Desacordo Máx. (%)" htmlFor="p-dis">
          <TextInput id="p-dis" type="number" required value={maxDisagreement} onChange={(e) => setMaxDisagreement(e.target.value)} />
        </FormField>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#171717]">Culturas Cobertas</p>
        <div className="flex flex-wrap gap-2">
          {crops.map((c) => {
            const active = selectedCrops.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCrop(c.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'border-[#E5E7EB] bg-white text-[#525252]'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#171717]">Províncias Elegíveis</p>
        <div className="flex flex-wrap gap-2">
          {ANGOLA_PROVINCES.map((p) => {
            const active = selectedProvinces.includes(p.name)
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => toggleProvince(p.name)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'border-[#E5E7EB] bg-white text-[#525252]'
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{submitting ? 'A publicar versão...' : 'Criar Produto Paramétrico'}</span>
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-medium text-[#171717] hover:bg-[#F8F9FA]"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
