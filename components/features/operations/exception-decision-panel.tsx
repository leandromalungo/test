'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { FormField, TextInput, TextareaInput } from '@/components/ui/field'
import { StatusBadge } from '@/components/ui/status-badge'
import type {
  ClimateEvent,
  ClimateSourceComparison,
  InsurancePolicy,
  OperationalException,
} from '@/types/domain'

export interface EnrichedException extends OperationalException {
  event: ClimateEvent | null
  comparison: ClimateSourceComparison | null
  policy: InsurancePolicy | null
}

/**
 * Painel de investigação e decisão manual do Operador sobre excepções climáticas.
 * Todas as aprovações, rejeições ou escalonamentos exigem justificação documentada.
 */
export function ExceptionDecisionPanel({
  exceptions,
}: {
  exceptions: EnrichedException[]
}) {
  const router = useRouter()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submitDecision(
    exceptionId: string,
    decision: 'approve' | 'reject' | 'escalate'
  ) {
    setLoadingId(exceptionId)
    setError(null)
    const reason = reasons[exceptionId] || ''
    const overrideRaw = overrides[exceptionId]

    try {
      const res = await fetch('/api/operations/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exceptionId,
          decision,
          reason,
          overrideObservedMm:
            overrideRaw !== undefined && overrideRaw !== ''
              ? Number(overrideRaw)
              : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao registar decisão manual.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erro de comunicação com o serviço operacional.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      {exceptions.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-8 text-center text-sm text-[#737373]">
          Não existem excepções operacionais registadas.
        </div>
      ) : (
        exceptions.map((ex) => {
          const isResolved = ex.status === 'approved' || ex.status === 'rejected'
          return (
            <div
              key={ex.id}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#171717]">
                      {ex.policyNumber}
                    </span>
                    <span className="text-xs text-[#737373]">·</span>
                    <span className="text-xs text-[#525252]">{ex.farmName}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#171717]">
                    {ex.description}
                  </p>
                </div>

                <StatusBadge
                  label={
                    ex.status === 'open'
                      ? 'Aberta'
                      : ex.status === 'escalated'
                        ? 'Escalada'
                        : ex.status === 'approved'
                          ? 'Aprovada'
                          : 'Rejeitada'
                  }
                  tone={
                    ex.status === 'approved'
                      ? 'success'
                      : ex.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }
                />
              </div>

              {/* Evidências comparativas do evento */}
              <div className="grid gap-4 rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-[#737373]">Janela Avaliada</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717] tabular-nums">
                    {ex.event ? `${ex.event.windowStart} a ${ex.event.windowEnd}` : 'N/D'}
                  </p>
                </div>
                <div>
                  <span className="text-[#737373]">Comparação entre Fontes</span>
                  <p className="mt-0.5 font-mono text-[#171717] tabular-nums">
                    {ex.comparison
                      ? `${ex.comparison.primaryAccumulatedMm ?? 'N/D'} mm vs ${ex.comparison.secondaryAccumulatedMm ?? 'N/D'} mm (${ex.comparison.disagreementPercent ?? 'N/D'}%)`
                      : ex.event?.evidenceSummary || 'Sem evidência secundária'}
                  </p>
                </div>
                <div>
                  <span className="text-[#737373]">Gatilho Contratual</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717] tabular-nums">
                    {ex.policy
                      ? `${ex.policy.contractTerms.triggerThresholdMm} mm (${ex.policy.contractTerms.coverageType})`
                      : 'N/D'}
                  </p>
                </div>
              </div>

              {isResolved ? (
                <div className="rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3 text-xs text-[#525252]">
                  <strong>Decisão registada:</strong> {ex.decisionReason} (Resolvida em{' '}
                  {ex.resolvedAt?.slice(0, 16).replace('T', ' ')})
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <FormField
                        label="Justificação Obrigatória da Decisão"
                        htmlFor={`reason-${ex.id}`}
                      >
                        <TextareaInput
                          id={`reason-${ex.id}`}
                          placeholder="Explique os fundamentos meteorológicos e documentais da decisão (mín. 10 caracteres)..."
                          value={reasons[ex.id] || ''}
                          onChange={(e) =>
                            setReasons({ ...reasons, [ex.id]: e.target.value })
                          }
                        />
                      </FormField>
                    </div>
                    <FormField
                      label="Precipitação Validada (mm)"
                      htmlFor={`ovr-${ex.id}`}
                      hint="Opcional; obrigatório se os dados iniciais estiverem em falta."
                    >
                      <TextInput
                        id={`ovr-${ex.id}`}
                        type="number"
                        step="0.1"
                        placeholder={
                          ex.event?.observedPrecipitationMm !== null &&
                          ex.event?.observedPrecipitationMm !== undefined
                            ? String(ex.event.observedPrecipitationMm)
                            : 'Ex.: 52.0'
                        }
                        value={overrides[ex.id] || ''}
                        onChange={(e) =>
                          setOverrides({ ...overrides, [ex.id]: e.target.value })
                        }
                      />
                    </FormField>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={loadingId === ex.id}
                      onClick={() => submitDecision(ex.id, 'approve')}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#16A34A] px-4 text-xs font-medium text-white hover:bg-[#15803D] disabled:opacity-50"
                    >
                      {loadingId === ex.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Aprovar Caso e Calcular Indemnização</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === ex.id}
                      onClick={() => submitDecision(ex.id, 'reject')}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Rejeitar Excepção</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === ex.id}
                      onClick={() => submitDecision(ex.id, 'escalate')}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 text-xs font-medium text-[#B45309] hover:bg-[#FEF3C7] disabled:opacity-50"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Escalar Incidente</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
