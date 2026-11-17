import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

/**
 * Página de investigação detalhada de eventos climáticos no Portal do Operador.
 * Exibe evidências técnicas, qualidade de dados e histórico comparativo sem permitir adulteração.
 */
export default async function OperationsEventsPage() {
  const ctx = await requirePortalAccess(['operator'])
  const db = await loadPlatformState({ role: 'operator', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Investigação de Eventos Climáticos
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Consulte todos os eventos detectados pelo motor paramétrico, respectivas evidências meteorológicas e estado da qualidade de dados.
        </p>
      </div>

      <div className="space-y-4">
        {db.climateEvents.map((evt) => {
          const st = mapEventStatusTone(evt.status)
          const comparison = evt.comparisonId
            ? db.climateComparisons.find((c) => c.id === evt.comparisonId)
            : null

          return (
            <div
              key={evt.id}
              className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#171717]">
                      {evt.policyNumber}
                    </span>
                    <span className="text-xs text-[#737373]">·</span>
                    <span className="text-xs font-medium text-[#525252]">
                      {evt.customerName} — {evt.farmName} ({evt.province})
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#737373] tabular-nums">
                    Janela: {evt.windowStart} a {evt.windowEnd} · Cobertura:{' '}
                    {evt.coverageType === 'drought' ? 'Seca' : 'Excesso de Chuva'} · Chave:{' '}
                    {evt.eventKey}
                  </p>
                </div>
                <StatusBadge label={st.label} tone={st.tone} />
              </div>

              <div className="grid gap-3 rounded-md border border-[#E5E7EB] bg-[#F8F9FA] p-3.5 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-[#737373]">Observado</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717] tabular-nums">
                    {evt.observedPrecipitationMm !== null
                      ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                      : 'Indisponível (null)'}
                  </p>
                </div>
                <div>
                  <span className="text-[#737373]">Gatilho Contratual</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717] tabular-nums">
                    {evt.contractualThresholdMm.toFixed(1)} mm
                  </p>
                </div>
                <div>
                  <span className="text-[#737373]">Qualidade</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717]">
                    {evt.dataQualityStatus}
                  </p>
                </div>
                <div>
                  <span className="text-[#737373]">Indemnização Apurada</span>
                  <p className="mt-0.5 font-mono font-medium text-[#171717] tabular-nums">
                    {evt.calculatedIndemnityAoa !== null
                      ? formatAOA(evt.calculatedIndemnityAoa)
                      : 'Bloqueada / Pendente'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#525252]">{evt.ruleAppliedExplanation}</p>
              <p className="font-mono text-xs text-[#737373]">
                Evidência: {evt.evidenceSummary}
              </p>
              {comparison && (
                <p className="font-mono text-xs text-[#737373]">
                  Comparação secundária ({comparison.primaryProvider} vs{' '}
                  {comparison.secondaryProvider}):{' '}
                  {comparison.primaryAccumulatedMm ?? 'N/D'} mm vs{' '}
                  {comparison.secondaryAccumulatedMm ?? 'N/D'} mm · Divergência:{' '}
                  {comparison.disagreementPercent ?? 'N/D'}%
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
