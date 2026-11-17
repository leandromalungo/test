import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPublicCatalog } from '@/lib/repositories/platform-repository'
import { ProductForm } from '@/components/features/admin/product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  await requirePortalAccess(['manager'])
  const db = await loadPublicCatalog()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Configurar Novo Produto de Seguro Paramétrico
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Defina culturas, províncias, gatilhos climáticos e faixas de indemnização.
        </p>
      </div>
      <ProductForm crops={db.crops} />
    </div>
  )
}
