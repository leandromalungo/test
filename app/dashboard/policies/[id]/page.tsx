import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone, mapPolicyStatusTone } from '@/components/ui/status-badge'
import { PolicyActions } from '@/components/features/policies/policy-payment-action'

export const dynamic = 'force-dynamic'

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await requirePortalAccess(['farmer', 'manager', 'operator'])
  const { id } = await params
  const db = await loadPlatformState({
    role: ctx.user.role,
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const policy = db.policies.find((p) => p.id === id)

  if (!policy) {
    notFound()
  }
  if (ctx.user.role === 'farmer' && policy.customerId !== ctx.customer?.id) {
    notFound()
  }

  const events = db.climateEvents.filter((e) => e.policyId === policy.id)
  const st = mapPolicyStatusTone(policy.status)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/policies"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#737373] hover:text-[#171717]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar às apólices</span>
        </Link>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-[#171717]">
                {policy.policyNumber}
              </h1>
              <StatusBadge label={st.label} tone={st.tone} />
            </div>
            <p className="mt-1 text-sm text-[#737373]">
              {policy.productName} · Versão contratual imutável v{policy.contractTerms.productVersionNumber}
            </p>
          </div>
          <PolicyActions policy={policy} />
        </div>
      </div>

      {policy.contractTerms.isSimulatedDemonstration && (
        <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#B45309]">
          <strong>Apólice de Demonstração Simulada:</strong> Emitida para validação técnica do MVP em Angola sem valor contratual real.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#171717]">
            Dados da Cobertura e Propriedade
          </h2>
          <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
            <dt className="text-[#737373]">Produtor</dt>
            <dd className="font-medium text-[#171717]">{policy.customerName}</dd>
            <dt className="text-[#737373]">Propriedade</dt>
            <dd className="font-medium text-[#171717]">{policy.farmName}</dd>
            <dt className="text-[#737373]">Localização</dt>
            <dd className="text-[#171717]">{policy.municipality}, {policy.province}</dd>
            <dt className="text-[#737373]">Coordenadas</dt>
            <dd className="font-mono tabular-nums">{policy.latitude.toFixed(4)}, {policy.longitude.toFixed(4)}</dd>
            <dt className="text-[#737373]">Cultura</dt>
            <dd className="text-[#171717]">{policy.cropName}</dd>
            <dt className="text-[#737373]">Vigência</dt>
            <dd className="font-mono tabular-nums">{policy.startDate} até {policy.endDate}</dd>
            <dt className="text-[#737373]">Capital Segurado</dt>
            <dd className="font-mono font-semibold text-[#171717] tabular-nums">{formatAOA(policy.insuredCapitalAoa)}</dd>
            <dt className="text-[#737373]">Prémio</dt>
            <dd className="font-mono font-semibold text-[#171717] tabular-nums">{formatAOA(policy.premiumAoa)}</dd>
          </dl>
        </section>

        <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#171717]">
            Regras Paramétricas Contratuais (Imutáveis)
          </h2>
          <p className="text-xs text-[#737373]">
            {policy.contractTerms.climateIndicator} · Gatilho:{' '}
            <strong className="font-mono text-[#171717]">
              {policy.contractTerms.coverageType === 'drought' ? '< ' : '> '}
              {policy.contractTerms.triggerThresholdMm} mm em {policy.contractTerms.observationWindowDays} dias
            </strong>
          </p>
          <div className="divide-y divide-[#E5E7EB] border-t border-[#E5E7EB] pt-2">
            {policy.contractTerms.severityBands.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 text-xs">
                <span className="text-[#525252]">{b.label}</span>
                <span className="font-mono font-medium text-[#171717] tabular-nums">
                  {b.payoutPercentage}% do capital
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Eventos climáticos associados */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#171717]">
            Histórico de Monitorização e Eventos desta Apólice
          </h2>
        </div>
        {events.length === 0 ? (
          <div className="p-5 text-sm text-[#737373]">
            Nenhum evento de monitorização registado para esta apólice até ao momento.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {events.map((evt) => {
              const est = mapEventStatusTone(evt.status)
              return (
                <div key={evt.id} className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-[#171717] tabular-nums">
                      Janela {evt.windowStart} a {evt.windowEnd} · Observado:{' '}
                      {evt.observedPrecipitationMm !== null
                        ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                        : 'Insuficiente'}
                    </span>
                    <StatusBadge label={est.label} tone={est.tone} />
                  </div>
                  <p className="text-sm text-[#525252]">{evt.ruleAppliedExplanation}</p>
                  {evt.calculatedIndemnityAoa !== null && evt.calculatedIndemnityAoa > 0 && (
                    <p className="font-mono text-xs font-semibold text-[#16A34A] tabular-nums">
                      Indemnização apurada: {formatAOA(evt.calculatedIndemnityAoa)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
