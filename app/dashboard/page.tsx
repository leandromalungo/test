import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone, mapPolicyStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function FarmerOverviewPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const customerId = ctx.customer?.id
  const state = await loadPlatformState({
    role: 'farmer',
    customerId: customerId ?? null,
    userId: ctx.user.id,
  })

  const myFarms = state.farms.filter((f) => f.customerId === customerId)
  const myPolicies = state.policies.filter((p) => p.customerId === customerId)
  const activePolicies = myPolicies.filter((p) => p.status === 'active')
  const myEvents = state.climateEvents.filter((e) => e.customerId === customerId)
  const myPayments = state.payments.filter((p) => p.customerId === customerId)
  const totalCapital = activePolicies.reduce((s, p) => s + p.insuredCapitalAoa, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Olá, {ctx.user.fullName}
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Resumo das suas propriedades agrícolas, apólices paramétricas e monitorização de precipitação.
          </p>
        </div>
        <Link
          href="/dashboard/simulate"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <span>Simular Nova Cobertura</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Métricas principais em faixa limpa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Propriedades Registadas</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#171717] tabular-nums">
            {myFarms.length}
          </p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Apólices Activas</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#16A34A] tabular-nums">
            {activePolicies.length}
          </p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Capital Total Protegido</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#171717] tabular-nums">
            {formatAOA(totalCapital)}
          </p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#737373]">Pagamentos Registados</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#171717] tabular-nums">
            {myPayments.length}
          </p>
        </div>
      </div>

      {/* Apólices recentes */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#171717]">As Suas Apólices</h2>
          <Link href="/dashboard/policies" className="text-xs font-medium text-[#2563EB] hover:underline">
            Ver todas
          </Link>
        </div>
        {myPolicies.length === 0 ? (
          <div className="p-6 text-sm text-[#737373]">
            Ainda não possui apólices emitidas. Utilize o simulador para iniciar uma cobertura.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
                <tr>
                  <th className="px-4 py-2.5">Apólice</th>
                  <th className="px-4 py-2.5">Propriedade · Cultura</th>
                  <th className="px-4 py-2.5 text-right">Capital</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {myPolicies.slice(0, 5).map((p) => {
                  const st = mapPolicyStatusTone(p.status)
                  return (
                    <tr key={p.id} className="hover:bg-[#F8F9FA]">
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        <Link href={`/dashboard/policies/${p.id}`} className="text-[#2563EB] hover:underline">
                          {p.policyNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#525252]">
                        {p.farmName} · {p.cropName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {formatAOA(p.insuredCapitalAoa)}
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
        )}
      </section>

      {/* Últimos eventos de monitorização */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#171717]">
              Estado da Monitorização Climática
            </h2>
            <Link href="/dashboard/climate" className="text-xs font-medium text-[#2563EB] hover:underline">
              Consultar chuvas
            </Link>
          </div>
          {myEvents.length === 0 ? (
            <p className="text-sm text-[#737373]">
              Nenhum evento climático avaliado até ao momento para as suas apólices.
            </p>
          ) : (
            <div className="space-y-3">
              {myEvents.slice(0, 4).map((evt) => {
                const st = mapEventStatusTone(evt.status)
                return (
                  <div key={evt.id} className="border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium text-[#171717]">
                        {evt.policyNumber} · {evt.windowStart} a {evt.windowEnd}
                      </span>
                      <StatusBadge label={st.label} tone={st.tone} />
                    </div>
                    <p className="mt-1 text-xs text-[#737373]">{evt.ruleAppliedExplanation}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#171717]">
              Propriedades Georreferenciadas
            </h2>
            <Link href="/dashboard/farms/new" className="text-xs font-medium text-[#2563EB] hover:underline">
              Nova propriedade
            </Link>
          </div>
          {myFarms.length === 0 ? (
            <p className="text-sm text-[#737373]">Nenhuma propriedade registada.</p>
          ) : (
            <div className="space-y-3">
              {myFarms.map((f) => (
                <div key={f.id} className="flex items-start justify-between border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-[#171717] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#16A34A]" />
                      <span>{f.name}</span>
                    </p>
                    <p className="text-xs text-[#737373]">
                      {f.municipality}, {f.province} · {f.primaryCropName}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#737373] tabular-nums">
                    {f.areaHectares} ha
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
