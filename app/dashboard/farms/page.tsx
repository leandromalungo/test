import Link from 'next/link'
import { MapPin, Plus } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { repoListFarms } from '@/lib/repositories/platform-repository'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function FarmerFarmsPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const farms = await repoListFarms({
    role: 'farmer',
    customerId: ctx.customer?.id ?? null,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Propriedades Agrícolas
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Cada lavra possui coordenadas próprias utilizadas para recolha de precipitação por satélite.
          </p>
        </div>
        <Link
          href="/dashboard/farms/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Registar Propriedade</span>
        </Link>
      </div>

      {farms.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma propriedade registada"
          description="Adicione a sua primeira lavra agrícola com localização em Angola para simular coberturas contra seca ou excesso de chuva."
          actionLabel="Registar Primeira Lavra"
          actionHref="/dashboard/farms/new"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-3">Nome da Lavra</th>
                <th className="px-4 py-3">Província / Município</th>
                <th className="px-4 py-3">Coordenadas</th>
                <th className="px-4 py-3">Cultura Principal</th>
                <th className="px-4 py-3 text-right">Área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {farms.map((farm) => (
                <tr key={farm.id} className="hover:bg-[#F8F9FA]">
                  <td className="px-4 py-3 font-medium text-[#171717]">{farm.name}</td>
                  <td className="px-4 py-3 text-xs text-[#525252]">
                    {farm.province} · {farm.municipality} ({farm.commune})
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#737373] tabular-nums">
                    {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#171717]">
                    {farm.primaryCropName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {farm.areaHectares} ha
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
