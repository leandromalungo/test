import Link from 'next/link'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  const activePolicies = db.policies.filter((p) => p.status === 'active')
  const totalExposure = activePolicies.reduce((s, p) => s + p.insuredCapitalAoa, 0)
  const totalPremiums = db.policies
    .filter((p) => p.status === 'active' || p.status === 'expired')
    .reduce((s, p) => s + p.premiumAoa, 0)
  const totalIndemnities = db.indemnities.reduce(
    (s, i) => s + i.calculatedIndemnityAoa,
    0
  )
  const openExceptions = db.exceptions.filter(
    (e) => e.status === 'open' || e.status === 'escalated'
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Painel Executivo · NOSSA Seguros
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Visão consolidada da carteira paramétrica agrícola, exposição financeira e eventos climáticos em Angola.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/monitoring"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap"
          >
            Executar Monitorização
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Exposição Activa Total</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#171717] tabular-nums">
            {formatAOA(totalExposure)}
          </p>
          <p className="mt-1 text-xs text-[#737373]">{activePolicies.length} apólices activas</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Prémios Emitidos</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#16A34A] tabular-nums">
            {formatAOA(totalPremiums)}
          </p>
          <p className="mt-1 text-xs text-[#737373]">{db.customers.length} agricultores registados</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Indemnizações Apuradas</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#2563EB] tabular-nums">
            {formatAOA(totalIndemnities)}
          </p>
          <p className="mt-1 text-xs text-[#737373]">{db.indemnities.length} cálculos auditados</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Excepções Abertas</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#D97706] tabular-nums">
            {openExceptions.length}
          </p>
          <p className="mt-1 text-xs text-[#737373]">Bloqueadas para revisão manual</p>
        </div>
      </div>

      <section className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#171717]">
            Eventos Climáticos Recentes
          </h2>
          <Link href="/admin/events" className="text-xs font-medium text-[#2563EB] hover:underline">
            Ver todos os eventos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-2.5">Apólice</th>
                <th className="px-4 py-2.5">Lavra · Província</th>
                <th className="px-4 py-2.5 text-right">Observado / Gatilho</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {db.climateEvents.slice(0, 6).map((evt) => {
                const st = mapEventStatusTone(evt.status)
                return (
                  <tr key={evt.id}>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{evt.policyNumber}</td>
                    <td className="px-4 py-3 text-xs text-[#525252]">
                      {evt.farmName} · {evt.province}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {evt.observedPrecipitationMm !== null
                        ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                        : 'Insuficiente'}{' '}
                      / {evt.contractualThresholdMm} mm
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={st.label} tone={st.tone} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
