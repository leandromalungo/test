import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requirePortalAccess } from '@/lib/auth/guards'
import { repoListProducts } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'
import { StatusBadge } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  await requirePortalAccess(['manager'])
  const products = await repoListProducts()

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Produtos e Regras Paramétricas
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Configure gatilhos, culturas elegíveis, províncias e taxas sem alterar o código-fonte.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Criar Novo Produto</span>
        </Link>
      </div>

      <div className="space-y-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#737373]">
                  <span className="font-mono font-semibold text-[#171717]">{p.code}</span>
                  <span>·</span>
                  <span>Versão v{p.activeVersionNumber}</span>
                </div>
                <h2 className="mt-1 text-base font-semibold text-[#171717]">{p.name}</h2>
              </div>
              <StatusBadge
                label={p.status === 'active' ? 'Activo' : 'Inactivo'}
                tone={p.status === 'active' ? 'success' : 'neutral'}
              />
            </div>

            <p className="text-sm text-[#737373]">{p.description}</p>

            <div className="grid gap-4 border-t border-[#E5E7EB] pt-3 text-xs sm:grid-cols-4">
              <div>
                <span className="text-[#737373]">Gatilho</span>
                <p className="font-mono font-medium text-[#171717] tabular-nums">
                  {p.coverageType === 'drought' ? '< ' : '> '}
                  {p.triggerThresholdMm} mm / {p.observationWindowDays}d
                </p>
              </div>
              <div>
                <span className="text-[#737373]">Taxa Base</span>
                <p className="font-mono font-medium text-[#171717] tabular-nums">
                  {(p.basePremiumRate * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-[#737373]">Capital Mínimo / Máximo</span>
                <p className="font-mono text-[#171717] tabular-nums">
                  {formatAOA(p.minCapitalAoa)} — {formatAOA(p.maxCapitalAoa)}
                </p>
              </div>
              <div>
                <span className="text-[#737373]">Províncias Cobertas</span>
                <p className="text-[#171717]">{p.supportedProvinces.join(', ')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
