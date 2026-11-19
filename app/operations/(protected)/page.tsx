import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
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

/**
 * Painel inicial do Operador de Operações e Qualidade de Dados.
 * Resume excepções pendentes, comparações entre fontes e eventos bloqueados.
 */
export default async function OperationsOverviewPage() {
  const ctx = await requirePortalAccess(['operator'])
  const db = await loadPlatformState({ role: 'operator', userId: ctx.user.id })

  const openExceptions = db.exceptions.filter(
    (e) => e.status === 'open' || e.status === 'escalated' || e.status === 'under_review'
  )
  const resolvedExceptions = db.exceptions.filter(
    (e) => e.status === 'approved' || e.status === 'rejected'
  )
  const failedComparisons = db.climateComparisons.filter((c) => !c.passed)
  const exceptionEvents = db.climateEvents.filter(
    (evt) => evt.status === 'exception' || evt.status === 'manual_review'
  )

  const passedComparisons = db.climateComparisons.filter((c) => c.passed).length
  const totalComparisons = db.climateComparisons.length
  const concordancePct =
    totalComparisons > 0
      ? Math.round((passedComparisons / totalComparisons) * 100)
      : 100

  const comparisonPoints: PillBarPoint[] = db.climateComparisons
    .slice(0, 6)
    .map((c) => ({
      label: c.windowEnd.slice(5),
      primaryValue: c.primaryAccumulatedMm ?? 0,
      secondaryValue: c.secondaryAccumulatedMm ?? 0,
      formattedPrimary:
        c.primaryAccumulatedMm !== null
          ? `${c.primaryAccumulatedMm.toFixed(0)}mm`
          : 'N/D',
      formattedSecondary:
        c.secondaryAccumulatedMm !== null
          ? `${c.secondaryAccumulatedMm.toFixed(0)}mm`
          : 'N/D',
    }))

  return (
    <div className="space-y-5">
      <DashboardHeaderBar
        greeting="Painel Operacional & Qualidade"
        subtitle="Supervisão de excepções meteorológicas, discordâncias entre fontes e decisões auditadas."
        periodLabel={`Limiar ${db.settings.defaultDisagreementThresholdPercent}%`}
        actionHref="/operations/exceptions"
        actionLabel={`Tratar Excepções (${openExceptions.length})`}
      />

      {/* Grelha superior em 3 blocos */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <StackedHighlightCards
            title="Estado das Validações"
            href="/operations/exceptions"
            items={[
              {
                title: 'Excepções Pendentes',
                subtitle: `${exceptionEvents.length} eventos em análise`,
                metric: `${openExceptions.length}`,
                subMetric: 'bloqueios activos',
                icon: 'satellite-radar',
              },
              {
                title: 'Decisões Auditadas',
                subtitle: 'Aprovações e rejeições',
                metric: `${resolvedExceptions.length}`,
                subMetric: 'encerradas',
                icon: 'agro-shield',
              },
              {
                title: 'Discordâncias Fontes',
                subtitle: `Acima de ${db.settings.defaultDisagreementThresholdPercent}%`,
                metric: `${failedComparisons.length}`,
                subMetric: `de ${totalComparisons} testes`,
                icon: 'rain-cloud',
              },
            ]}
          />
        </div>

        <div className="xl:col-span-6">
          <PillBarChartCard
            title="Comparação Climática entre Fontes"
            primaryToggleLabel="ERA5 (mm)"
            secondaryToggleLabel="NASA (mm)"
            unitLabel="Precipitação acumulada por janela (Open-Meteo vs NASA POWER)"
            href="/operations/data-quality"
            points={comparisonPoints}
          />
        </div>

        <div className="xl:col-span-3">
          <RingAndProgressCard
            title="Qualidade das Séries"
            href="/operations/data-quality"
            headlineLabel="Concordância entre Fontes"
            headlineValue={`${concordancePct}%`}
            ringPercent={concordancePct}
            ringCenterValue={`${concordancePct}%`}
            ringCenterCaption="Aprovadas"
            progressLabel="Completude Mínima"
            progressValueText={`${db.settings.defaultMinCompletenessPercent}%`}
            progressPercent={db.settings.defaultMinCompletenessPercent}
            quickTiles={[
              { label: 'Excepções', href: '/operations/exceptions', icon: 'exceptions' },
              { label: 'Qualidade', href: '/operations/data-quality', icon: 'quality' },
              { label: 'Eventos', href: '/operations/events', icon: 'events' },
              { label: 'Auditoria', href: '/operations/audit', icon: 'policies' },
            ]}
          />
        </div>
      </div>

      {/* Grelha inferior: Fila Prioritária + Comparações */}
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0D1526]">
                Fila Prioritária de Excepções
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                Eventos retidos preventivamente por divergência ou falta de completude
              </p>
            </div>
            <Link
              href="/operations/exceptions"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E5E7EB] px-3 text-[11px] font-medium text-[#0D1526] hover:bg-[#F4F6F9]"
            >
              <span>Abrir painel</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {openExceptions.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F9FB] p-8 text-center text-sm text-[#6B7280]">
              Nenhuma excepção aberta no momento. Todas as janelas climáticas estão validadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#ECEFF3] text-[11px] font-medium text-[#6B7280]">
                  <tr>
                    <th className="py-2.5 pr-3">Apólice</th>
                    <th className="px-3 py-2.5">Lavra &amp; Descrição</th>
                    <th className="py-2.5 pl-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {openExceptions.slice(0, 5).map((ex) => (
                    <tr
                      key={ex.id}
                      className="odd:bg-white even:bg-[#F6FAFF] transition-colors hover:bg-[#EFF6FF]"
                    >
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-2.5 font-mono text-xs font-semibold text-[#0D1526]">
                          <DashboardPngIcon
                            icon="satellite-radar"
                            alt="Excepção climática"
                            size={24}
                          />
                          <span>{ex.policyNumber}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#525252]">
                        <p className="font-medium text-[#0D1526]">{ex.farmName}</p>
                        <p className="text-[11px] text-[#6B7280]">{ex.description}</p>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <StatusBadge
                          label={ex.status === 'escalated' ? 'Escalada' : 'Aberta'}
                          tone="warning"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5 xl:col-span-4">
          <CompactSummaryTile
            title="Eventos Recentes"
            subtitle="Monitorização automática em curso"
            metricValue={`${db.climateEvents.length}`}
            deltaPill={`${passedComparisons}/${totalComparisons} ok`}
            href="/operations/events"
            footnote="ERA5 + NASA POWER"
          />

          <section className="rounded-[24px] border border-[#ECEFF3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#0D1526]">
                Últimos Eventos Avaliados
              </h2>
              <Link
                href="/operations/events"
                className="text-[11px] font-semibold text-[#1D4ED8] hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="space-y-2.5">
              {db.climateEvents.slice(0, 3).map((evt) => {
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
                        {evt.farmName} ({evt.province})
                      </p>
                    </div>
                    <StatusBadge label={st.label} tone={st.tone} />
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
