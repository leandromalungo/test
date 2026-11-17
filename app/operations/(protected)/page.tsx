import Link from 'next/link'
import { ArrowRight, GitCompare, ShieldAlert } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { StatusBadge, mapEventStatusTone } from '@/components/ui/status-badge'

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Painel Operacional & Qualidade de Dados
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Supervisão de excepções meteorológicas, discordâncias entre provedores e decisões manuais auditadas.
          </p>
        </div>
        <Link
          href="/operations/exceptions"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8]"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Tratar Excepções ({openExceptions.length})</span>
        </Link>
      </div>

      {/* Métricas operacionais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">Excepções Abertas / Escaladas</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#DC2626] tabular-nums">
            {openExceptions.length}
          </p>
          <p className="mt-1 text-xs text-[#737373]">Bloqueios preventivos pendentes</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">Discordâncias entre Fontes</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#D97706] tabular-nums">
            {failedComparisons.length}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            Acima do limiar de {db.settings.defaultDisagreementThresholdPercent}%
          </p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">Eventos sob Investigação</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#171717] tabular-nums">
            {exceptionEvents.length}
          </p>
          <p className="mt-1 text-xs text-[#737373]">Aguardando validação manual</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-medium text-[#737373]">Decisões Resolvidas</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#16A34A] tabular-nums">
            {resolvedExceptions.length}
          </p>
          <p className="mt-1 text-xs text-[#737373]">Total encerrado com auditoria</p>
        </div>
      </div>

      {/* Lista rápida de excepções pendentes */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#171717]">
            Fila Prioritária de Excepções
          </h2>
          <Link
            href="/operations/exceptions"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            <span>Abrir painel de decisão</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {openExceptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#737373]">
              Nenhuma excepção aberta no momento. Todas as janelas climáticas estão validadas.
            </div>
          ) : (
            openExceptions.slice(0, 5).map((ex) => (
              <div
                key={ex.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#171717]">
                      {ex.policyNumber}
                    </span>
                    <span className="text-xs text-[#737373]">·</span>
                    <span className="text-xs text-[#525252]">{ex.farmName}</span>
                  </div>
                  <p className="text-sm text-[#525252]">{ex.description}</p>
                </div>
                <StatusBadge
                  label={ex.status === 'escalated' ? 'Escalada' : 'Aberta'}
                  tone="warning"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comparações recentes entre provedores */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-[#737373]" />
            <h2 className="text-sm font-semibold text-[#171717]">
              Últimas Comparações Open-Meteo vs NASA POWER
            </h2>
          </div>
          <Link
            href="/operations/data-quality"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            <span>Validar fontes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-2.5">Janela</th>
                <th className="px-4 py-2.5 text-right">Primária (mm)</th>
                <th className="px-4 py-2.5 text-right">Secundária (mm)</th>
                <th className="px-4 py-2.5 text-right">Divergência</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {db.climateComparisons.slice(0, 5).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                    {c.windowStart} a {c.windowEnd}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {c.primaryAccumulatedMm !== null
                      ? `${c.primaryAccumulatedMm.toFixed(1)} mm`
                      : 'N/D'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {c.secondaryAccumulatedMm !== null
                      ? `${c.secondaryAccumulatedMm.toFixed(1)} mm`
                      : 'N/D'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {c.disagreementPercent !== null
                      ? `${c.disagreementPercent.toFixed(1)}%`
                      : 'N/D'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={c.passed ? 'Concordante' : 'Discordância Crítica'}
                      tone={c.passed ? 'success' : 'danger'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Eventos recentes monitorizados */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#171717]">
            Eventos Climáticos Recentes
          </h2>
          <Link
            href="/operations/events"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
          >
            <span>Ver todos os eventos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {db.climateEvents.slice(0, 4).map((evt) => {
            const st = mapEventStatusTone(evt.status)
            return (
              <div
                key={evt.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-[#171717]">
                    {evt.policyNumber} · {evt.farmName} ({evt.province})
                  </p>
                  <p className="mt-0.5 text-xs text-[#737373]">
                    {evt.ruleAppliedExplanation}
                  </p>
                </div>
                <StatusBadge label={st.label} tone={st.tone} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
