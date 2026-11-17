import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import {
  ExceptionDecisionPanel,
  type EnrichedException,
} from '@/components/features/operations/exception-decision-panel'

export const dynamic = 'force-dynamic'

/**
 * Página de tratamento de excepções operacionais do Operador.
 * Enriquecimento server-side com evento climático, comparação entre fontes e termos da apólice.
 */
export default async function OperationsExceptionsPage() {
  const ctx = await requirePortalAccess(['operator'])
  const db = await loadPlatformState({ role: 'operator', userId: ctx.user.id })

  const enriched: EnrichedException[] = db.exceptions.map((ex) => {
    const event = db.climateEvents.find((e) => e.id === ex.eventId) || null
    const comparison =
      event?.comparisonId
        ? db.climateComparisons.find((c) => c.id === event.comparisonId) || null
        : null
    const policy = db.policies.find((p) => p.id === ex.policyId) || null
    return {
      ...ex,
      event,
      comparison,
      policy,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Excepções Pendentes e Revisão Manual
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Investigue bloqueios causados por falhas de cobertura climática ou discordância entre fontes. Nenhuma excepção pode ser resolvida sem justificação registada em auditoria.
        </p>
      </div>

      <ExceptionDecisionPanel exceptions={enriched} />
    </div>
  )
}
