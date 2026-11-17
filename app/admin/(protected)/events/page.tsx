import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'
import { IndemnityPayoutButton } from '@/components/features/admin/indemnity-payout-button'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Eventos Climáticos e Evidências
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Inspecione a regra aplicada, evidências das fontes meteorológicas e simule pagamentos de indemnizações apuradas.
        </p>
      </div>

      <div className="space-y-4">
        {db.climateEvents.map((evt) => {
          const st = mapEventStatusTone(evt.status)
          return (
            <div key={evt.id} className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#171717]">
                    {evt.policyNumber} · {evt.customerName} · {evt.farmName} ({evt.province})
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[#737373] tabular-nums">
                    Janela: {evt.windowStart} a {evt.windowEnd} · Observado:{' '}
                    {evt.observedPrecipitationMm !== null
                      ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                      : 'Insuficiente'}{' '}
                    / Gatilho: {evt.contractualThresholdMm.toFixed(1)} mm
                  </p>
                </div>
                <StatusBadge label={st.label} tone={st.tone} />
              </div>

              <p className="text-sm text-[#525252]">{evt.ruleAppliedExplanation}</p>
              <p className="font-mono text-xs text-[#737373]">
                Evidência: {evt.evidenceSummary}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] pt-3">
                <div className="font-mono text-xs tabular-nums">
                  Indemnização:{' '}
                  <strong className="text-[#171717]">
                    {evt.calculatedIndemnityAoa !== null
                      ? formatAOA(evt.calculatedIndemnityAoa)
                      : 'Pendente de validação'}
                  </strong>
                </div>

                {evt.status === 'indemnity_calculated' &&
                  evt.calculatedIndemnityAoa !== null &&
                  evt.calculatedIndemnityAoa > 0 && (
                    <IndemnityPayoutButton
                      policyId={evt.policyId}
                      eventId={evt.id}
                    />
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
