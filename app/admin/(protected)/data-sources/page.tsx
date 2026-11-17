import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { StatusBadge } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function AdminDataSourcesPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Fontes de Dados Meteorológicos
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Distinção clara entre integrações externas activas em tempo real e adaptadores preparados para acordos institucionais futuros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {db.climateProviders.map((prov) => (
          <div key={prov.id} className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-[#737373]">
                  {prov.code} · {prov.role === 'primary' ? 'Fonte Primária' : prov.role === 'confirmation' ? 'Confirmação' : 'Planeada'}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#171717]">{prov.name}</h2>
              </div>
              <StatusBadge
                label={prov.status === 'active' ? 'Integrada' : 'Planeada'}
                tone={prov.status === 'active' ? 'success' : 'neutral'}
              />
            </div>
            <p className="text-sm text-[#525252]">{prov.description}</p>
            <div className="border-t border-[#E5E7EB] pt-3 text-xs text-[#737373] space-y-1">
              <p>
                <strong className="text-[#171717]">Resolução:</strong> {prov.spatialResolution} · {prov.temporalResolution}
              </p>
              <p className="truncate font-mono">
                <strong className="font-sans text-[#171717]">Endpoint:</strong> {prov.endpointUrl}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
