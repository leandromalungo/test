import Link from 'next/link'
import { FileCheck2 } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge, mapPolicyStatusTone } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function FarmerPoliciesPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const db = await loadPlatformState({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const policies = db.policies.filter((p) => p.customerId === ctx.customer?.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            As Suas Apólices
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Consulte apólices activas, pendentes ou expiradas e descarregue os certificados em PDF.
          </p>
        </div>
        <Link
          href="/dashboard/simulate"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          Nova Simulação
        </Link>
      </div>

      {policies.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Nenhuma apólice emitida"
          description="Utilize o simulador paramétrico para calcular o prémio e subscrever a sua primeira cobertura."
          actionLabel="Ir para o Simulador"
          actionHref="/dashboard/simulate"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-3">N.º Apólice</th>
                <th className="px-4 py-3">Propriedade · Cultura</th>
                <th className="px-4 py-3">Gatilho</th>
                <th className="px-4 py-3 text-right">Capital Segurado</th>
                <th className="px-4 py-3 text-right">Prémio</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {policies.map((pol) => {
                const st = mapPolicyStatusTone(pol.status)
                return (
                  <tr key={pol.id} className="hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      <Link
                        href={`/dashboard/policies/${pol.id}`}
                        className="text-[#2563EB] hover:underline"
                      >
                        {pol.policyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#525252]">
                      {pol.farmName} ({pol.province}) · {pol.cropName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      {pol.contractTerms.coverageType === 'drought' ? '< ' : '> '}
                      {pol.contractTerms.triggerThresholdMm} mm / {pol.contractTerms.observationWindowDays}d
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {formatAOA(pol.insuredCapitalAoa)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {formatAOA(pol.premiumAoa)}
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
