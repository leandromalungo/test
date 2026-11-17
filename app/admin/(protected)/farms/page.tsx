import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

export const dynamic = 'force-dynamic'

export default async function AdminFarmsPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Propriedades Agrícolas Registadas
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Todas as lavras georreferenciadas por província, cultura e área cultivada.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">Propriedade</th>
              <th className="px-4 py-3">Localização</th>
              <th className="px-4 py-3">Coordenadas</th>
              <th className="px-4 py-3">Cultura</th>
              <th className="px-4 py-3 text-right">Área</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {db.farms.map((f) => (
              <tr key={f.id} className="hover:bg-[#F8F9FA]">
                <td className="px-4 py-3 font-medium text-[#171717]">{f.name}</td>
                <td className="px-4 py-3 text-xs text-[#525252]">
                  {f.province} · {f.municipality} ({f.commune})
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#737373] tabular-nums">
                  {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-xs">{f.primaryCropName}</td>
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                  {f.areaHectares} ha
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
