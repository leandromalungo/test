import Link from 'next/link'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge, mapPolicyStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function AdminPoliciesPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Gestão Global de Apólices
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Todas as apólices emitidas, pendentes e expiradas com ligação directa ao certificado PDF.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">N.º Apólice</th>
              <th className="px-4 py-3">Segurado</th>
              <th className="px-4 py-3">Lavra · Província</th>
              <th className="px-4 py-3 text-right">Capital Segurado</th>
              <th className="px-4 py-3 text-right">Prémio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {db.policies.map((p) => {
              const st = mapPolicyStatusTone(p.status)
              return (
                <tr key={p.id} className="hover:bg-[#F8F9FA]">
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    <Link href={`/dashboard/policies/${p.id}`} className="text-[#2563EB] hover:underline">
                      {p.policyNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-[#171717]">
                    {p.customerName}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#525252]">
                    {p.farmName} · {p.province}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {formatAOA(p.insuredCapitalAoa)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {formatAOA(p.premiumAoa)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={st.label} tone={st.tone} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/policies/${p.id}/document`}
                      className="text-xs font-medium text-[#2563EB] hover:underline"
                    >
                      Descarregar
                    </a>
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
