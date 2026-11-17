import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { MonitoringRunner } from '@/components/features/admin/monitoring-runner'
import { ClimateExplorer } from '@/components/features/climate/climate-explorer'

export const dynamic = 'force-dynamic'

export default async function AdminMonitoringPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Motor de Monitorização Climática
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Execute ciclos manuais ou teste cenários completos (activação, não-activação, duplicados, dados insuficientes e discordância entre fontes).
        </p>
      </div>

      <MonitoringRunner policies={db.policies} />

      <ClimateExplorer
        farms={db.farms}
        initialObservations={db.climateObservations}
        initialComparisons={db.climateComparisons}
        allowDemoDisagreement
      />
    </div>
  )
}
