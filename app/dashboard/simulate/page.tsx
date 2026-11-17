import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { SimulatorWorkspace } from '@/components/features/insurance/simulator-workspace'

export const dynamic = 'force-dynamic'

export default async function SimulatePage() {
  const ctx = await requirePortalAccess(['farmer'])
  const state = await loadPlatformState({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const farms = state.farms.filter((f) => f.customerId === ctx.customer?.id)
  const activeProducts = state.products.filter((p) => p.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Simulador de Seguro Paramétrico
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Simule o prémio da sua cobertura, reveja os gatilhos meteorológicos e emita a sua apólice digital.
        </p>
      </div>

      <SimulatorWorkspace
        farms={farms}
        crops={state.crops}
        campaigns={state.campaigns}
        products={activeProducts}
      />
    </div>
  )
}
