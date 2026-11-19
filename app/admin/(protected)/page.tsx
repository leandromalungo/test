import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'
import { PillBarChartCard, type PillBarPoint } from '@/components/features/shared/pill-bar-chart'
import {
  CompactSummaryTile,
  DashboardHeaderBar,
  DashboardPngIcon,
  RingAndProgressCard,
  StackedHighlightCards,
} from '@/components/features/shared/dashboard-widgets'

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

  // Agrupamento real de exposição e prémios por província
  const provinceMap = new Map<string, { exposure: number; premiums: number }>()
  for (const pol of db.policies) {
    const entry = provinceMap.get(pol.province) ?? { exposure: 0, premiums: 0 }
    if (pol.status === 'active') {
      entry.exposure += pol.insuredCapitalAoa
    }
    if (pol.status === 'active' || pol.status === 'expired') {
      entry.premiums += pol.premiumAoa
    }
    provinceMap.set(pol.province, entry)
  }

  const provinceChartPoints: PillBarPoint[] = Array.from(provinceMap.entries())
    .sort((a, b) => b[1].exposure - a[1].exposure)
    .slice(0, 6)
    .map(([province, vals]) => ({
      label: province,
      primaryValue: Math.round(vals.exposure / 1000),
      secondaryValue: Math.round(vals.premiums / 1000),
      formattedPrimary: `${Math.round(vals.exposure / 1000)}k`,
      formattedSecondary: `${Math.round(vals.premiums / 1000)}k`,
    }))

  const activeRatio =
    db.policies.length > 0
      ? Math.round((activePolicies.length / db.policies.length) * 100)
      : 0

  const lossRatioPct =
    totalPremiums > 0
      ? Math.min(100, Math.round((totalIndemnities / totalPremiums) * 100))
      : 0

  return (
    <div className="space-y-5">
      <DashboardHeaderBar
        greeting="Painel Executivo · NOSSA Seguros"
        subtitle="Visão consolidada da carteira paramétrica agrícola, exposição financeira e eventos em Angola."
        periodLabel="Carteira Activa"
        actionHref="/admin/monitoring"
        actionLabel="Executar Monitorização"
      />

      {/* Grelha superior em 3 colunas */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <StackedHighlightCards
            title="Indicadores da Carteira"
            href="/admin/exposure"
            items={[
              {
                title: 'Exposição Activa',
                subtitle: `${activePolicies.length} apólices em vigor`,
                metric: formatAOA(totalExposure),
                subMetric: `${db.farms.length} lavras`,
                icon: 'agro-shield',
              },
              {
                title: 'Prémios Emitidos',
                subtitle: `${db.customers.length} agricultores`,
                metric: formatAOA(totalPremiums),
                subMetric: 'receita técnica',
                icon: 'rain-cloud',
              },
              {
                title: 'Indemnizações',
                subtitle: `${db.indemnities.length} cálculos auditados`,
                metric: formatAOA(totalIndemnities),
                subMetric: `${openExceptions.length} excepções`,
                icon: 'satellite-radar',
              },
            ]}
          />
        </div>

        <div className="xl:col-span-6">
          <PillBarChartCard
            title="Exposição & Prémios por Província"
            primaryToggleLabel="Exposição"
            secondaryToggleLabel="Prémios"
            unitLabel="Valores em milhares de Kwanzas (k AOA) por província"
            href="/admin/exposure"
            points={provinceChartPoints}
          />
        </div>

        <div className="xl:col-span-3">
          <RingAndProgressCard
            title="Carteira & Risco"
            href="/admin/reports"
            headlineLabel="Exposição Total Segurada"
            headlineValue={formatAOA(totalExposure)}
            ringPercent={activeRatio}
            ringCenterValue={`${activeRatio}%`}
            ringCenterCaption="Activas"
            progressLabel="Sinistralidade / Prémios"
            progressValueText={`${lossRatioPct}%`}
            progressPercent={Math.max(12, lossRatioPct)}
            quickTiles={[
              { label: 'Produtos', href: '/admin/products', icon: 'policies' },
              { label: 'Monitorização', href: '/admin/monitoring', icon: 'monitoring' },
              { label: 'Exposição', href: '/admin/exposure', icon: 'exposure' },
              { label: 'Pagamentos', href: '/admin/payments', icon: 'payments' },
            ]}
          />
        </div>
      </div>

      {/* Grelha inferior: Eventos Recentes + Resumo Operacional */}
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0D1526]">
                Eventos Climáticos Recentes
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                Comparação directa entre precipitação observada e gatilho contratual
              </p>
            </div>
            <Link
              href="/admin/events"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E5E7EB] px-3 text-[11px] font-medium text-[#0D1526] hover:bg-[#F4F6F9]"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#ECEFF3] text-[11px] font-medium text-[#6B7280]">
                <tr>
                  <th className="py-2.5 pr-3">Apólice</th>
                  <th className="px-3 py-2.5">Lavra · Província</th>
                  <th className="px-3 py-2.5 text-right">Observado / Gatilho</th>
                  <th className="py-2.5 pl-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {db.climateEvents.slice(0, 6).map((evt) => {
                  const st = mapEventStatusTone(evt.status)
                  const iconName =
                    evt.coverageType === 'drought' ? 'drought-sun' : 'rain-cloud'
                  return (
                    <tr
                      key={evt.id}
                      className="odd:bg-white even:bg-[#F6FAFF] transition-colors hover:bg-[#EFF6FF]"
                    >
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-2.5 font-mono text-xs font-semibold text-[#0D1526]">
                          <DashboardPngIcon
                            icon={iconName}
                            alt={evt.coverageType}
                            size={24}
                          />
                          <span>{evt.policyNumber}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#525252]">
                        {evt.farmName} · {evt.province}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-[#0D1526] tabular-nums">
                        {evt.observedPrecipitationMm !== null
                          ? `${evt.observedPrecipitationMm.toFixed(1)} mm`
                          : 'Insuficiente'}{' '}
                        / {evt.contractualThresholdMm} mm
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
        </section>

        <div className="flex flex-col gap-5 xl:col-span-4">
          <CompactSummaryTile
            title="Excepções Bloqueadas"
            subtitle="Casos encaminhados para revisão operacional"
            metricValue={`${openExceptions.length}`}
            deltaPill={`${db.products.filter((p) => p.status === 'active').length} produtos`}
            href="/admin/audit"
            footnote={`${db.customers.length} clientes registados`}
          />

          <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#0D1526]">
                Acesso Rápido de Gestão
              </h2>
              <Link
                href="/admin/products"
                className="text-[11px] font-semibold text-[#1D4ED8] hover:underline"
              >
                Configurar
              </Link>
            </div>
            <div className="space-y-2 text-xs">
              <Link
                href="/admin/data-sources"
                className="flex items-center justify-between rounded-xl bg-[#F7F9FB] px-3.5 py-2.5 font-medium text-[#0D1526] hover:bg-[#EFF6FF]"
              >
                <span>Fontes Climáticas Activas</span>
                <span className="font-mono text-[#6B7280]">ERA5 · NASA</span>
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center justify-between rounded-xl bg-[#F7F9FB] px-3.5 py-2.5 font-medium text-[#0D1526] hover:bg-[#EFF6FF]"
              >
                <span>Relatórios &amp; Risco de Base</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#6B7280]" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
