import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { ExposureAndBasisRisk } from '@/components/features/admin/exposure-and-basis-risk'

export const dynamic = 'force-dynamic'

export default async function AdminExposurePage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })
  const activePolicies = db.policies.filter((p) => p.status === 'active')

  const map = new Map<
    string,
    { province: string; policiesCount: number; capitalAoa: number; premiumsAoa: number }
  >()

  for (const p of activePolicies) {
    const cur = map.get(p.province) || {
      province: p.province,
      policiesCount: 0,
      capitalAoa: 0,
      premiumsAoa: 0,
    }
    cur.policiesCount += 1
    cur.capitalAoa += p.insuredCapitalAoa
    cur.premiumsAoa += p.premiumAoa
    map.set(p.province, cur)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Exposição Financeira e Análise de Risco de Base
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Monitorização de capital acumulado por província e laboratório histórico de validação de gatilhos.
        </p>
      </div>

      <ExposureAndBasisRisk
        byProvince={Array.from(map.values()).sort((a, b) => b.capitalAoa - a.capitalAoa)}
      />
    </div>
  )
}
