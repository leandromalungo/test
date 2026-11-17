import { CreditCard } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge, mapPaymentStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function FarmerPaymentsPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const db = await loadPlatformState({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const payments = db.payments.filter((p) => p.customerId === ctx.customer?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Histórico de Pagamentos (Simulados)
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Registo de pagamentos simulados de prémios e recebimentos de indemnizações.
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sem movimentos registados"
          description="Os pagamentos de prémios e indemnizações das suas apólices serão listados nesta tabela."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Apólice</th>
                <th className="px-4 py-3">Canal Simulado</th>
                <th className="px-4 py-3 text-right">Montante</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {payments.map((pay) => {
                const st = mapPaymentStatusTone(pay.status)
                return (
                  <tr key={pay.id}>
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      {pay.transactionReference}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {pay.kind === 'premium' ? 'Prémio' : 'Indemnização'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{pay.policyNumber}</td>
                    <td className="px-4 py-3 text-xs text-[#737373]">{pay.channel}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-medium tabular-nums">
                      {formatAOA(pay.amountAoa)}
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
    </div>
  )
}
