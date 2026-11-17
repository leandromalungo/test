'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play } from 'lucide-react'
import { FormField, SelectInput } from '@/components/ui/field'
import type { InsurancePolicy } from '@/types/domain'

interface MonitoringRunnerProps {
  policies: InsurancePolicy[]
}

interface MonitoringReportResult {
  policiesEvaluated: number
  duplicatesPrevented: number
  usedLiveExternalApi: boolean
  summary: string
}

/**
 * Consola de execução manual e validação de cenários do Motor de Monitorização (`POST /api/monitoring/run`).
 * Permite testar dados reais, activação de gatilhos, não-activação, dados insuficientes,
 * discordância entre fontes e prevenção de eventos duplicados.
 */
export function MonitoringRunner({ policies }: MonitoringRunnerProps) {
  const router = useRouter()
  const activePolicies = policies.filter((p) => p.status === 'active')
  const [policyId, setPolicyId] = useState(activePolicies[0]?.id || '')
  const [scenario, setScenario] = useState<string>('live_or_stored')
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<MonitoringReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/monitoring/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: policyId || undefined,
          scenario,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Falha ao executar monitorização.')
      } else {
        setReport(data.report)
        router.refresh()
      }
    } catch {
      setError('Erro de comunicação ao invocar o motor.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-[#171717]">
          Executar Motor de Monitorização Climática
        </h2>
        <p className="mt-1 text-xs text-[#737373]">
          Dispara o endpoint <code className="font-mono">POST /api/monitoring/run</code> (compatível também com Cron externo via Bearer token).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Alvo da Execução" htmlFor="mon-policy">
          <SelectInput
            id="mon-policy"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
          >
            <option value="">Todas as Apólices Activas ({activePolicies.length})</option>
            {activePolicies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policyNumber} — {p.farmName} ({p.province})
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Cenário de Avaliação" htmlFor="mon-scenario">
          <SelectInput
            id="mon-scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="live_or_stored">Dados Externos Reais (Open-Meteo + NASA POWER)</option>
            <option value="normal_no_trigger">Cenário Demo: Precipitação Normal (Sem Gatilho)</option>
            <option value="drought_trigger">Cenário Demo: Seca Severa (Activar Gatilho)</option>
            <option value="excess_rain_trigger">Cenário Demo: Excesso de Chuva (Activar Gatilho)</option>
            <option value="insufficient_data">Cenário Demo: Dados Insuficientes (Bloqueio)</option>
            <option value="source_disagreement">Cenário Demo: Discordância entre Fontes (Excepção)</option>
          </SelectInput>
        </FormField>
      </div>

      <button
        type="button"
        disabled={running}
        onClick={handleRun}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        <span>{running ? 'A processar janelas climáticas...' : 'Executar Monitorização'}</span>
      </button>

      {report && (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-xs text-[#15803D] space-y-1">
          <p className="font-semibold">{report.summary}</p>
          <p>
            Fonte externa ao vivo utilizada: {report.usedLiveExternalApi ? 'Sim' : 'Não (Cenário/Armazenado)'} · Duplicados bloqueados: {report.duplicatesPrevented}
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}
    </div>
  )
}
