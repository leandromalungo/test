import { Download } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Relatórios e Exportação
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Exporte a posição consolidada de apólices, prémios, eventos climáticos e indemnizações em CSV auditável.
          </p>
        </div>
        <a
          href="/api/admin/reports?format=csv"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Relatório CSV</span>
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">Apólice</th>
              <th className="px-4 py-3">Produtor</th>
              <th className="px-4 py-3">Província</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">Prémio</th>
              <th className="px-4 py-3 text-right">Indemnização</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {db.policies.map((p) => {
              const indSum = db.indemnities
                .filter((i) => i.policyId === p.id)
                .reduce((s, i) => s + i.calculatedIndemnityAoa, 0)
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-2.5 text-xs">{p.customerName}</td>
                  <td className="px-4 py-2.5 text-xs text-[#525252]">{p.province}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {formatAOA(p.insuredCapitalAoa)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {formatAOA(p.premiumAoa)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {formatAOA(indSum)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
