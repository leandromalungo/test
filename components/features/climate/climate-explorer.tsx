'use client'

import { useState } from 'react'
import { CloudRain, GitCompare, Loader2 } from 'lucide-react'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'
import { StatusBadge } from '@/components/ui/status-badge'
import { PrecipitationChart } from './precipitation-chart'
import type {
  ClimateObservation,
  ClimateSourceComparison,
  FarmProperty,
} from '@/types/domain'

interface ClimateExplorerProps {
  farms: FarmProperty[]
  initialObservations: ClimateObservation[]
  initialComparisons: ClimateSourceComparison[]
  allowDemoDisagreement?: boolean
}

/**
 * Explorador climático interativo que consulta as APIs externas reais
 * (Open-Meteo ERA5 e NASA POWER) através das rotas Next.js seguras.
 */
export function ClimateExplorer({
  farms,
  initialObservations,
  initialComparisons,
  allowDemoDisagreement = false,
}: ClimateExplorerProps) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '')
  const [provider, setProvider] = useState<'open_meteo_era5' | 'nasa_power'>('open_meteo_era5')
  const [startDate, setStartDate] = useState('2026-10-01')
  const [endDate, setEndDate] = useState('2026-10-30')
  const [observations, setObservations] = useState<ClimateObservation[]>(initialObservations)
  const [comparisons, setComparisons] = useState<ClimateSourceComparison[]>(initialComparisons)
  const [fetching, setFetching] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFetchExternal() {
    if (!farmId) return
    setFetching(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch('/api/climate/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, provider, startDate, endDate, mode: 'live' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao consultar provedor externo.')
      } else {
        setObservations(data.observations || [])
        setFeedback(
          `Recolhidas ${data.observations?.length ?? 0} observações reais de ${data.provider}. Cobertura válida: ${data.validation?.completenessPercent ?? 0}% (${data.validation?.accumulatedPrecipitationMm ?? 'N/D'} mm acumulados).`
        )
      }
    } catch {
      setError('Erro de ligação ao consultar dados meteorológicos.')
    } finally {
      setFetching(false)
    }
  }

  async function handleCompare(mode: 'live' | 'demo_disagreement') {
    if (!farmId) return
    setComparing(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch('/api/climate/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, startDate, endDate, mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao comparar fontes climáticas.')
      } else if (data.comparison) {
        setComparisons((prev) => [data.comparison, ...prev])
        setFeedback(data.comparison.notes)
      }
    } catch {
      setError('Erro de rede ao comparar fontes climáticas.')
    } finally {
      setComparing(false)
    }
  }

  const selectedFarm = farms.find((f) => f.id === farmId)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Propriedade" htmlFor="cl-farm">
            <SelectInput
              id="cl-farm"
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.province})
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Fonte Climática Externa" htmlFor="cl-provider">
            <SelectInput
              id="cl-provider"
              value={provider}
              onChange={(e) =>
                setProvider(e.target.value as 'open_meteo_era5' | 'nasa_power')
              }
            >
              <option value="open_meteo_era5">Open-Meteo ERA5 (Primária)</option>
              <option value="nasa_power">NASA POWER Daily (Confirmação)</option>
            </SelectInput>
          </FormField>

          <FormField label="Data Inicial" htmlFor="cl-start">
            <TextInput
              id="cl-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>

          <FormField label="Data Final" htmlFor="cl-end">
            <TextInput
              id="cl-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
        </div>

        {selectedFarm && (
          <p className="mt-3 font-mono text-xs text-[#737373] tabular-nums">
            Coordenadas consultadas: Lat {selectedFarm.latitude.toFixed(4)} · Lon{' '}
            {selectedFarm.longitude.toFixed(4)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={fetching || !farmId}
            onClick={handleFetchExternal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {fetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudRain className="h-4 w-4" />
            )}
            <span>Consultar Dados Externos Reais</span>
          </button>

          <button
            type="button"
            disabled={comparing || !farmId}
            onClick={() => handleCompare('live')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] hover:bg-[#F8F9FA] disabled:opacity-50"
          >
            {comparing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="h-4 w-4" />
            )}
            <span>Comparar Open-Meteo vs NASA POWER</span>
          </button>

          {allowDemoDisagreement && (
            <button
              type="button"
              disabled={comparing || !farmId}
              onClick={() => handleCompare('demo_disagreement')}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 text-sm font-medium text-[#B45309] hover:bg-[#FEF3C7] disabled:opacity-50"
            >
              Simular Discordância entre Fontes
            </button>
          )}
        </div>

        {feedback && (
          <div className="mt-4 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm text-[#15803D]">
            {feedback}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}
      </div>

      <PrecipitationChart observations={observations} />

      {/* Comparações registadas entre fontes */}
      {comparisons.length > 0 && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="border-b border-[#E5E7EB] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#171717]">
              Histórico de Comparações entre Fontes Climáticas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
                <tr>
                  <th className="px-4 py-2.5">Janela</th>
                  <th className="px-4 py-2.5 text-right">Primária (mm)</th>
                  <th className="px-4 py-2.5 text-right">Secundária (mm)</th>
                  <th className="px-4 py-2.5 text-right">Divergência</th>
                  <th className="px-4 py-2.5">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {comparisons.slice(0, 10).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                      {c.windowStart} a {c.windowEnd}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {c.primaryAccumulatedMm !== null ? `${c.primaryAccumulatedMm.toFixed(1)} mm` : 'N/D'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {c.secondaryAccumulatedMm !== null ? `${c.secondaryAccumulatedMm.toFixed(1)} mm` : 'N/D'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {c.disagreementPercent !== null ? `${c.disagreementPercent.toFixed(1)}%` : 'N/D'}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={c.passed ? 'Concordante' : 'Discordância Crítica'}
                        tone={c.passed ? 'success' : 'danger'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Amostra das observações com etiqueta explícita Real vs Simulado */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#171717]">
            Registos Diários de Precipitação (Origem Verificável)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Provedor</th>
                <th className="px-4 py-2.5 text-right">Precipitação</th>
                <th className="px-4 py-2.5">Origem</th>
                <th className="px-4 py-2.5">Qualidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {observations.slice(0, 15).map((obs) => (
                <tr key={obs.id}>
                  <td className="px-4 py-2 font-mono text-xs tabular-nums">
                    {obs.observationDate}
                  </td>
                  <td className="px-4 py-2 text-xs text-[#525252]">
                    {obs.providerName}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-medium tabular-nums">
                    {obs.precipitationMm === null
                      ? 'Em falta (null)'
                      : `${obs.precipitationMm.toFixed(1)} mm`}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <StatusBadge
                      label={obs.isSimulatedData ? 'Série Demo' : 'API Externa Real'}
                      tone={obs.isSimulatedData ? 'warning' : 'info'}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <StatusBadge
                      label={obs.qualityStatus === 'valid' ? 'Válido' : 'Insuficiente'}
                      tone={obs.qualityStatus === 'valid' ? 'success' : 'danger'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
