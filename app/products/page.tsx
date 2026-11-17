import Link from 'next/link'
import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'
import { loadPublicCatalog } from '@/lib/repositories/platform-repository'
import { formatAOA } from '@/config/angola'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const { crops, products } = await loadPublicCatalog()

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#171717]">
      <PublicNavbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#171717]">
              Produtos de Seguro Paramétrico
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#737373]">
              Especificações contratuais, faixas de severidade e limites de cobertura configurados no motor da seguradora para Angola.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
          >
            Simular no Portal
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {products.map((product) => {
            const cropNames = crops
              .filter((c) => product.supportedCropIds.includes(c.id))
              .map((c) => c.name)
              .join(' · ')

            return (
              <section
                key={product.id}
                className="rounded-lg border border-[#E5E7EB] bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E7EB] pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#737373]">
                      <span className="font-mono font-medium">{product.code}</span>
                      <span>·</span>
                      <span>Versão {product.activeVersionNumber}</span>
                      <span>·</span>
                      <span>
                        {product.coverageType === 'drought'
                          ? 'Cobertura contra Seca'
                          : 'Cobertura contra Excesso de Chuva'}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-[#171717]">
                      {product.name}
                    </h2>
                    <p className="mt-1.5 max-w-3xl text-sm text-[#737373]">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-[#737373]">Gatilho Contratual</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#171717] tabular-nums">
                      {product.coverageType === 'drought' ? '< ' : '> '}
                      {product.triggerThresholdMm} mm / {product.observationWindowDays}d
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#737373]">Taxa Base Indicativa</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#171717] tabular-nums">
                      {(product.basePremiumRate * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#737373]">Intervalo de Capital</p>
                    <p className="mt-1 font-mono text-sm font-medium text-[#171717] tabular-nums">
                      {formatAOA(product.minCapitalAoa)} — {formatAOA(product.maxCapitalAoa)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#737373]">Qualidade Mínima Exigida</p>
                    <p className="mt-1 font-mono text-sm font-medium text-[#171717] tabular-nums">
                      {product.minDataCompletenessPercent}% · Máx. desacordo {product.maxSourceDisagreementPercent}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#E5E7EB] pt-4 text-xs text-[#737373]">
                  <p>
                    <strong className="font-medium text-[#171717]">Culturas elegíveis:</strong>{' '}
                    {cropNames}
                  </p>
                  <p className="mt-1">
                    <strong className="font-medium text-[#171717]">Províncias cobertas:</strong>{' '}
                    {product.supportedProvinces.join(', ')}
                  </p>
                </div>
              </section>
            )
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
