import { AlertTriangle } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function FarmerClaimsPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const db = await loadPlatformState({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const events = db.climateEvents.filter((e) => e.customerId === ctx.customer?.id)
  const myPolicyIds = new Set(
    db.policies
      .filter((p) => p.customerId === ctx.customer?.id)
      .map((p) => p.id)
  )
  const indemnities = db.indemnities.filter((i) => myPolicyIds.has(i.policyId))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Eventos Climáticos e Indemnizações
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Acompanhe avaliações de gatilhos paramétricos e o cálculo detalhado de eventuais indemnizações.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sem eventos climáticos avaliados"
          description="Quando o motor de monitorização avaliar janelas de chuva das suas apólices activas, os resultados aparecerão aqui."
        />
      ) : (
        <div className="space-y-4">
          {events.map((evt) => {
            const st = mapEventStatusTone(evt.status)
            const ind = indemnities.find((i) => i.eventId === evt.id)
            return (
              <div
                key={evt.id}
                className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#171717]">
                      {evt.policyNumber} · {evt.farmName}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-[#737373] tabular-nums">
                      Período: {evt.windowStart} a {evt.windowEnd} · Observado:{' '}
                      {evt.observedPrecipitationMm !== null
                        ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                        : 'Sem leitura válida'}{' '}
                      / Gatilho: {evt.contractualThresholdMm.toFixed(1)} mm
                    </p>
                  </div>
                  <StatusBadge label={st.label} tone={st.tone} />
                </div>

                <p className="text-sm text-[#525252]">{evt.ruleAppliedExplanation}</p>

                {ind && (
                  <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#15803D]">
                    <p className="font-semibold">
                      Indemnização Calculada: {formatAOA(ind.calculatedIndemnityAoa)} ({ind.payoutPercentage}% · {ind.severityLabel})
                    </p>
                    <p className="mt-1">{ind.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
