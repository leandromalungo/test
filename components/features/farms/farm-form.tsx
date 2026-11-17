'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin } from 'lucide-react'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'
import type { CropType } from '@/types/domain'

interface FarmFormProps {
  crops: CropType[]
}

/**
 * Formulário de registo de propriedade agrícola georreferenciada em Angola.
 * Ao seleccionar uma província, sugere coordenadas representativas editáveis pelo agricultor.
 */
export function FarmForm({ crops }: FarmFormProps) {
  const router = useRouter()
  const defaultProvince = ANGOLA_PROVINCES[0]

  const [name, setName] = useState('')
  const [province, setProvince] = useState(defaultProvince.name)
  const [municipality, setMunicipality] = useState(defaultProvince.municipalityExample)
  const [commune, setCommune] = useState('')
  const [latitude, setLatitude] = useState(String(defaultProvince.latitude))
  const [longitude, setLongitude] = useState(String(defaultProvince.longitude))
  const [areaHectares, setAreaHectares] = useState('5')
  const [primaryCropId, setPrimaryCropId] = useState(crops[0]?.id || 'crop-milho')
  const [soilType, setSoilType] = useState('Franco-argiloso')
  const [irrigationType, setIrrigationType] = useState<'rainfed' | 'partial_irrigation'>('rainfed')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleProvinceChange(newProvName: string) {
    setProvince(newProvName)
    const found = ANGOLA_PROVINCES.find((p) => p.name === newProvName)
    if (found) {
      setMunicipality(found.municipalityExample)
      setLatitude(String(found.latitude))
      setLongitude(String(found.longitude))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          province,
          municipality,
          commune,
          latitude: Number(latitude),
          longitude: Number(longitude),
          areaHectares: Number(areaHectares),
          primaryCropId,
          soilType,
          irrigationType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível registar a propriedade.')
        setSubmitting(false)
        return
      }
      router.push('/dashboard/farms')
      router.refresh()
    } catch {
      setError('Erro de comunicação ao gravar a lavra.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <FormField label="Nome da Lavra / Propriedade" htmlFor="farm-name">
        <TextInput
          id="farm-name"
          required
          placeholder="Ex.: Lavra Nova Esperança"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Província" htmlFor="farm-province">
          <SelectInput
            id="farm-province"
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
          >
            {ANGOLA_PROVINCES.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Município" htmlFor="farm-municipality">
          <TextInput
            id="farm-municipality"
            required
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
          />
        </FormField>
        <FormField label="Comuna / Localidade" htmlFor="farm-commune">
          <TextInput
            id="farm-commune"
            required
            placeholder="Ex.: Catata"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
          />
        </FormField>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#171717]">
          <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
          <span>Coordenadas Geográficas para Consulta Satélite (Angola)</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Latitude (graus decimais)"
            htmlFor="farm-lat"
            hint="Intervalo válido em Angola: -18.2 a -4.2"
          >
            <TextInput
              id="farm-lat"
              type="number"
              step="0.0001"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </FormField>
          <FormField
            label="Longitude (graus decimais)"
            htmlFor="farm-lon"
            hint="Intervalo válido em Angola: 11.4 a 24.2"
          >
            <TextInput
              id="farm-lon"
              type="number"
              step="0.0001"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Área Cultivada (Hectares)" htmlFor="farm-area">
          <TextInput
            id="farm-area"
            type="number"
            step="0.5"
            min="0.5"
            required
            value={areaHectares}
            onChange={(e) => setAreaHectares(e.target.value)}
          />
        </FormField>
        <FormField label="Cultura Principal" htmlFor="farm-crop">
          <SelectInput
            id="farm-crop"
            value={primaryCropId}
            onChange={(e) => setPrimaryCropId(e.target.value)}
          >
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Regime Hídrico" htmlFor="farm-irr">
          <SelectInput
            id="farm-irr"
            value={irrigationType}
            onChange={(e) =>
              setIrrigationType(e.target.value as 'rainfed' | 'partial_irrigation')
            }
          >
            <option value="rainfed">Sequeiro (Chuva)</option>
            <option value="partial_irrigation">Regadio Parcial</option>
          </SelectInput>
        </FormField>
      </div>

      <FormField label="Tipo de Solo" htmlFor="farm-soil">
        <TextInput
          id="farm-soil"
          required
          value={soilType}
          onChange={(e) => setSoilType(e.target.value)}
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

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{submitting ? 'A registar...' : 'Guardar Propriedade'}</span>
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
