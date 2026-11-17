'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, TrendingUp } from 'lucide-react'
import { ANGOLA_PROVINCES, formatAOA } from '@/config/angola'
import { FormField, SelectInput, TextInput } from '@/components/ui/field'
import { StatusBadge } from '@/components/ui/status-badge'
import type { BasisRiskAnalysisResult } from '@/services/risk/basis-risk-service'

interface ProvinceExposure {
  province: string
  policiesCount: number
  capitalAoa: number
  premiumsAoa: number
}

export function ExposureAndBasisRisk({
  byProvince,
}: {
  byProvince: ProvinceExposure[]
}) {
  const [province, setProvince] = useState('Huambo')
  const [coverageType, setCoverageType] = useState<'drought' | 'excess_rain'>('drought')
  const [thresholdMm, setThresholdMm] = useState('110')
  const [windowDays, setWindowDays] = useState('30')
  const [running, setRunning] = useState(false)
  const [analysis, setAnalysis] = useState<BasisRiskAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRunBasisTest(e: React.FormEvent) {
    e.preventDefault()
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/basis-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          province,
          coverageType,
          triggerThresholdMm: Number(thresholdMm),
          windowDays: Number(windowDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Falha ao executar análise histórica.')
      } else {
        setAnalysis(data.analysis)
      }
    } catch {
      setError('Erro de ligação ao executar simulação histórica.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Gráfico de exposição por província */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-base font-semibold text-[#171717]">
          Exposição Financeira Activa por Província (AOA)
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Capital segurado concentrado em apólices activas para controlo de acumulação geográfica.
        </p>

        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byProvince} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#737373' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#737373' }}
                tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(v) => [formatAOA(Number(v)), 'Capital Segurado']}
                contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }}
              />
              <Bar dataKey="capitalAoa" fill="#2563EB" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Simulador de Risco de Base e Teste Histórico */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#171717]">
            Laboratório Histórico e Análise de Risco de Base (2021–2025)
          </h2>
          <p className="mt-1 text-xs text-[#737373]">
            Compara precipitação histórica (Open-Meteo ERA5 vs NASA POWER) para identificar potenciais falsos positivos, falsos negativos e discrepâncias entre fontes.
          </p>
        </div>

        <form onSubmit={handleRunBasisTest} className="grid gap-4 sm:grid-cols-5 items-end">
          <FormField label="Província" htmlFor="br-prov">
            <SelectInput id="br-prov" value={province} onChange={(e) => setProvince(e.target.value)}>
              {ANGOLA_PROVINCES.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Cenário" htmlFor="br-cov">
            <SelectInput
              id="br-cov"
              value={coverageType}
              onChange={(e) => setCoverageType(e.target.value as 'drought' | 'excess_rain')}
            >
              <option value="drought">Seca</option>
              <option value="excess_rain">Excesso Chuva</option>
            </SelectInput>
          </FormField>

          <FormField label="Gatilho (mm)" htmlFor="br-trig">
            <TextInput id="br-trig" type="number" value={thresholdMm} onChange={(e) => setThresholdMm(e.target.value)} />
          </FormField>

          <FormField label="Janela (dias)" htmlFor="br-win">
            <TextInput id="br-win" type="number" value={windowDays} onChange={(e) => setWindowDays(e.target.value)} />
          </FormField>

          <button
            type="submit"
            disabled={running}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            <span>Simular 5 Anos</span>
          </button>
        </form>

        {error && (
          <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-4 border-t border-[#E5E7EB] pt-5">
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3">
                <span className="text-[#737373]">Potenciais Falsos Negativos</span>
                <p className="mt-1 font-mono text-lg font-semibold text-[#D97706] tabular-nums">
                  {analysis.falseNegativeCount} anos
                </p>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3">
                <span className="text-[#737373]">Potenciais Falsos Positivos</span>
                <p className="mt-1 font-mono text-lg font-semibold text-[#2563EB] tabular-nums">
                  {analysis.falsePositiveCount} anos
                </p>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3">
                <span className="text-[#737373]">Excepções por Divergência</span>
                <p className="mt-1 font-mono text-lg font-semibold text-[#DC2626] tabular-nums">
                  {analysis.disagreementCount} anos
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
                  <tr>
                    <th className="px-4 py-2.5">Ano</th>
                    <th className="px-4 py-2.5 text-right">Open-Meteo</th>
                    <th className="px-4 py-2.5 text-right">NASA POWER</th>
                    <th className="px-4 py-2.5 text-right">Desacordo</th>
                    <th className="px-4 py-2.5">Classificação Risco de Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {analysis.yearlyResults.map((row) => (
                    <tr key={row.year}>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold tabular-nums">
                        {row.year}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                        {row.openMeteoMm?.toFixed(1) ?? 'N/D'} mm
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                        {row.nasaPowerMm?.toFixed(1) ?? 'N/D'} mm
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                        {row.disagreementPercent?.toFixed(1) ?? 'N/D'}%
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <StatusBadge
                          label={row.basisRiskClassification.replaceAll('_', ' ')}
                          tone={
                            row.basisRiskClassification === 'data_exception'
                              ? 'danger'
                              : row.basisRiskClassification === 'potential_false_negative'
                                ? 'warning'
                                : row.triggerWouldActivate
                                  ? 'info'
                                  : 'success'
                          }
                        />
                        <p className="mt-1 text-[#737373]">{row.notes}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#B45309]">
              {analysis.disclaimer}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
