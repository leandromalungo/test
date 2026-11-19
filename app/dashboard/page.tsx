import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import {
  StatusBadge,
  mapEventStatusTone,
  mapPolicyStatusTone,
} from '@/components/ui/status-badge'
import { PillBarChartCard, type PillBarPoint } from '@/components/features/shared/pill-bar-chart'
import {
  CompactSummaryTile,
  DashboardHeaderBar,
  DashboardPngIcon,
  RingAndProgressCard,
  StackedHighlightCards,
} from '@/components/features/shared/dashboard-widgets'

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
  const totalPremiums = myPolicies.reduce((s, p) => s + p.premiumAoa, 0)
  const totalPaid = myPayments
    .filter((p) => p.status === 'successful')
    .reduce((s, p) => s + p.amountAoa, 0)

  const droughtCount = activePolicies.filter(
    (p) => p.contractTerms.coverageType === 'drought'
  ).length
  const rainCount = activePolicies.filter(
    (p) => p.contractTerms.coverageType === 'excess_rain'
  ).length

  // Série real para o gráfico em barras cápsula: eventos climáticos recentes ou apólices
  const chartPoints: PillBarPoint[] =
    myEvents.length > 0
      ? myEvents.slice(0, 6).map((evt) => ({
          label: evt.farmName.split(' ')[0] || evt.policyNumber,
          primaryValue: evt.observedPrecipitationMm ?? 0,
          secondaryValue: evt.contractualThresholdMm,
          formattedPrimary:
            evt.observedPrecipitationMm !== null
              ? `${evt.observedPrecipitationMm.toFixed(0)}mm`
              : 'N/D',
          formattedSecondary: `${evt.contractualThresholdMm}mm`,
        }))
      : myPolicies.slice(0, 6).map((pol) => ({
          label: pol.cropName,
          primaryValue: Math.round(pol.insuredCapitalAoa / 1000),
          secondaryValue: Math.round(pol.premiumAoa / 1000),
          formattedPrimary: `${Math.round(pol.insuredCapitalAoa / 1000)}k`,
          formattedSecondary: `${Math.round(pol.premiumAoa / 1000)}k`,
        }))

  const completenessAvg =
    activePolicies.length > 0
      ? Math.round(
          activePolicies.reduce(
            (s, p) => s + p.contractTerms.minDataCompletenessPercent,
            0
          ) / activePolicies.length
        )
      : 85

  const activeRatio =
    myPolicies.length > 0
      ? Math.round((activePolicies.length / myPolicies.length) * 100)
      : 0

  return (
    <div className="space-y-5">
      <DashboardHeaderBar
        greeting={`Olá, ${ctx.user.fullName}`}
        subtitle="Resumo das suas lavras, coberturas paramétricas e monitorização climática em Angola."
        periodLabel="Campanha 2025/2026"
        actionHref="/dashboard/simulate"
        actionLabel="Simular Cobertura"
      />

      {/* Grelha principal superior em 3 blocos */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <StackedHighlightCards
            title="Coberturas & Lavras"
            href="/dashboard/policies"
            items={[
              {
                title: 'Apólices Activas',
                subtitle: `${droughtCount} seca · ${rainCount} chuva`,
                metric: `${activePolicies.length}`,
                subMetric: `de ${myPolicies.length} totais`,
                icon: 'agro-shield',
              },
              {
                title: 'Lavras Registadas',
                subtitle: `${myFarms.reduce((s, f) => s + f.areaHectares, 0).toFixed(1)} ha totais`,
                metric: `${myFarms.length}`,
                subMetric: ctx.user.province,
                icon: 'drought-sun',
              },
              {
                title: 'Eventos Climáticos',
                subtitle: 'Validação ERA5 & NASA',
                metric: `${myEvents.length}`,
                subMetric: `${myPayments.length} pagamentos`,
                icon: 'satellite-radar',
              },
            ]}
          />
        </div>

        <div className="xl:col-span-6">
          <PillBarChartCard
            title={
              myEvents.length > 0
                ? 'Precipitação Observada vs Gatilho'
                : 'Capital Segurado vs Prémio (k AOA)'
            }
            primaryToggleLabel={myEvents.length > 0 ? 'Observado' : 'Capital'}
            secondaryToggleLabel={myEvents.length > 0 ? 'Gatilho' : 'Prémio'}
            unitLabel={
              myEvents.length > 0
                ? 'Comparação em milímetros por janela climática'
                : 'Distribuição das apólices emitidas (milhares AOA)'
            }
            href="/dashboard/climate"
            points={chartPoints}
          />
        </div>

        <div className="xl:col-span-3">
          <RingAndProgressCard
            title="Resumo Financeiro"
            href="/dashboard/payments"
            headlineLabel="Capital Total Protegido"
            headlineValue={formatAOA(totalCapital)}
            ringPercent={completenessAvg}
            ringCenterValue={`${completenessAvg}%`}
            ringCenterCaption="Qualidade"
            progressLabel="Prémios Registados"
            progressValueText={formatAOA(totalPremiums)}
            progressPercent={activeRatio || 35}
            quickTiles={[
              { label: 'Nova Lavra', href: '/dashboard/farms/new', icon: 'farms' },
              { label: 'Simulador', href: '/dashboard/simulate', icon: 'simulate' },
              { label: 'Clima', href: '/dashboard/climate', icon: 'climate' },
              { label: 'Pagamentos', href: '/dashboard/payments', icon: 'payments' },
            ]}
          />
        </div>
      </div>

      {/* Grelha inferior: Tabela de Apólices + Eventos / Propriedades */}
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0D1526]">
                As Suas Apólices Recentes
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                Contratos paramétricos com termos congelados na emissão
              </p>
            </div>
            <Link
              href="/dashboard/policies"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E5E7EB] px-3 text-[11px] font-medium text-[#0D1526] hover:bg-[#F4F6F9]"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {myPolicies.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F9FB] p-6 text-center text-sm text-[#6B7280]">
              Ainda não possui apólices emitidas. Utilize o simulador para iniciar uma cobertura.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#ECEFF3] text-[11px] font-medium text-[#6B7280]">
                  <tr>
                    <th className="py-2.5 pr-3">Apólice</th>
                    <th className="px-3 py-2.5">Lavra · Cultura</th>
                    <th className="px-3 py-2.5 text-right">Capital</th>
                    <th className="py-2.5 pl-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {myPolicies.slice(0, 5).map((p) => {
                    const st = mapPolicyStatusTone(p.status)
                    const iconName =
                      p.contractTerms.coverageType === 'drought'
                        ? 'drought-sun'
                        : 'rain-cloud'
                    return (
                      <tr
                        key={p.id}
                        className="odd:bg-white even:bg-[#F6FAFF] transition-colors hover:bg-[#EFF6FF]"
                      >
                        <td className="py-3 pr-3">
                          <Link
                            href={`/dashboard/policies/${p.id}`}
                            className="inline-flex items-center gap-2.5 font-mono text-xs font-semibold text-[#1D4ED8] hover:underline"
                          >
                            <DashboardPngIcon
                              icon={iconName}
                              alt={p.productName}
                              size={24}
                            />
                            <span>{p.policyNumber}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#525252]">
                          {p.farmName} · {p.cropName}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-[#0D1526] tabular-nums">
                          {formatAOA(p.insuredCapitalAoa)}
                        </td>
                        <td className="py-3 pl-3 text-right">
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

        <div className="flex flex-col gap-5 xl:col-span-4">
          <CompactSummaryTile
            title="Pagamentos & Indemnizações"
            subtitle="Movimentos liquidados na carteira"
            metricValue={formatAOA(totalPaid)}
            deltaPill={`${myPayments.length} registos`}
            href="/dashboard/claims"
            footnote={`${myFarms.length} propriedades activas`}
          />

          <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-[#0D1526]">
                Últimos Eventos &amp; Lavras
              </h2>
              <Link
                href="/dashboard/farms/new"
                className="text-[11px] font-semibold text-[#1D4ED8] hover:underline"
              >
                + Nova lavra
              </Link>
            </div>

            {myEvents.length > 0 ? (
              <div className="space-y-2.5">
                {myEvents.slice(0, 3).map((evt) => {
                  const st = mapEventStatusTone(evt.status)
                  return (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#F7F9FB] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-semibold text-[#0D1526]">
                          {evt.policyNumber}
                        </p>
                        <p className="truncate text-[11px] text-[#6B7280]">
                          {evt.farmName} · {evt.windowStart}
                        </p>
                      </div>
                      <StatusBadge label={st.label} tone={st.tone} />
                    </div>
                  )
                })}
              </div>
            ) : myFarms.length > 0 ? (
              <div className="space-y-2.5">
                {myFarms.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#F7F9FB] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#0D1526]">
                          {f.name}
                        </p>
                        <p className="truncate text-[11px] text-[#6B7280]">
                          {f.municipality}, {f.province}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[#525252] tabular-nums">
                      {f.areaHectares} ha
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B7280]">
                Nenhuma lavra ou evento climático registado até ao momento.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
