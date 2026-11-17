import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { ClimateExplorer } from '@/components/features/climate/climate-explorer'

export const dynamic = 'force-dynamic'

export default async function FarmerClimatePage() {
  const ctx = await requirePortalAccess(['farmer'])
  const db = await loadPlatformState({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
    userId: ctx.user.id,
  })
  const myFarms = db.farms.filter((f) => f.customerId === ctx.customer?.id)
  const myObservations = db.climateObservations.filter((o) =>
    myFarms.some(
      (f) =>
        Math.abs(o.latitude - f.latitude) < 0.15 &&
        Math.abs(o.longitude - f.longitude) < 0.15
    )
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Monitorização Climática das Lavras
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Consulte dados reais de precipitação histórica (Open-Meteo ERA5 e NASA POWER) para as coordenadas das suas propriedades.
        </p>
      </div>

      <ClimateExplorer
        farms={myFarms}
        initialObservations={myObservations}
        initialComparisons={db.climateComparisons.filter((c) =>
          myFarms.some((f) => f.id === c.farmId)
        )}
      />
    </div>
  )
}
