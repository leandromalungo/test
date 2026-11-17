import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPublicCatalog } from '@/lib/repositories/platform-repository'
import { FarmForm } from '@/components/features/farms/farm-form'

export const dynamic = 'force-dynamic'

export default async function NewFarmPage() {
  await requirePortalAccess(['farmer'])
  const { crops } = await loadPublicCatalog()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Registar Nova Propriedade Agrícola
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Indique a localização e a cultura principal para habilitar simulações e apólices paramétricas.
        </p>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <FarmForm crops={crops} />
      </div>
    </div>
  )
}
