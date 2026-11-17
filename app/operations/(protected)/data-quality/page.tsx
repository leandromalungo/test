import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { ClimateExplorer } from '@/components/features/climate/climate-explorer'

export const dynamic = 'force-dynamic'

/**
 * Página de validação de qualidade de dados climáticos e comparação multi-fonte.
 * Permite consultar APIs reais externas (Open-Meteo e NASA POWER) e testar cenários de discordância.
 */
export default async function OperationsDataQualityPage() {
  const ctx = await requirePortalAccess(['operator'])
  const db = await loadPlatformState({ role: 'operator', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Qualidade de Dados e Comparação Multi-Fonte
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Consulte dados reais externos por coordenada, valide completude da série (sem converter valores em falta para 0 mm) e compare Open-Meteo ERA5 contra NASA POWER.
        </p>
      </div>

      <ClimateExplorer
        farms={db.farms}
        initialObservations={db.climateObservations}
        initialComparisons={db.climateComparisons}
        allowDemoDisagreement
      />
    </div>
  )
}
