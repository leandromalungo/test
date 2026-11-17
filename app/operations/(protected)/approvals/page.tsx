import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { StatusBadge } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

/**
 * Registo histórico de decisões manuais efectuadas pelos Operadores
 * (aprovações, rejeições e escalonamentos com justificação).
 */
export default async function OperationsApprovalsPage() {
  const ctx = await requirePortalAccess(['operator'])
  const db = await loadPlatformState({ role: 'operator', userId: ctx.user.id })

  const decided = db.exceptions.filter(
    (ex) => ex.status !== 'open'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Decisões Manuais Registadas
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Histórico de aprovações excepcionais, rejeições e escalonamentos com operador responsável e estado anterior preservado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">Apólice / Propriedade</th>
              <th className="px-4 py-3">Motivo da Excepção</th>
              <th className="px-4 py-3">Estado Anterior</th>
              <th className="px-4 py-3">Decisão</th>
              <th className="px-4 py-3">Justificação Documentada</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {decided.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#737373]">
                  Ainda não existem decisões manuais registadas. Resolva uma excepção na fila pendente.
                </td>
              </tr>
            ) : (
              decided.map((ex) => (
                <tr key={ex.id} className="hover:bg-[#F8F9FA]">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold text-[#171717]">
                      {ex.policyNumber}
                    </p>
                    <p className="text-xs text-[#737373]">{ex.farmName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#525252]">
                    {ex.reasonCode}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#737373]">
                    {ex.previousEventStatus}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={
                        ex.status === 'approved'
                          ? 'Aprovada'
                          : ex.status === 'rejected'
                            ? 'Rejeitada'
                            : 'Escalada'
                      }
                      tone={
                        ex.status === 'approved'
                          ? 'success'
                          : ex.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                    />
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-[#525252]">
                    {ex.decisionReason || 'Sem nota registada'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#737373] tabular-nums">
                    {(ex.resolvedAt || ex.createdAt).slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
