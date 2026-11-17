import Link from 'next/link'
import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#171717]">
      <PublicNavbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-[#171717]">
          Como Funciona o Seguro Agrícola Paramétrico
        </h1>
        <p className="mt-3 text-base text-[#737373]">
          Ao contrário do seguro agrícola tradicional baseado em inspecções presenciais lentas, o seguro paramétrico indemniza automaticamente com base num índice meteorológico objectivo e verificável.
        </p>

        <div className="mt-10 space-y-8 border-t border-[#E5E7EB] pt-8">
          <section>
            <h2 className="text-lg font-semibold text-[#171717]">
              1. Indicador Climático e Fontes Verificáveis
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#737373]">
              A plataforma recolhe precipitação diária acumulada (em milímetros) para as coordenadas exactas da lavra através da API histórica Open-Meteo (ERA5/ERA5-Land) como fonte primária e da API NASA POWER (PRECTOTCORR) como fonte independente de confirmação. Adaptadores para CHIRPS, INAMET, GGPEN e Copernicus encontram-se documentados para integração institucional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#171717]">
              2. Validação de Qualidade e Prevenção de Erros
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#737373]">
              Antes de activar qualquer indemnização, o motor valida completude temporal (&ge; 85% dos dias), integridade física dos valores, ausência de duplicados e concordância entre as duas fontes meteorológicas. Dias sem leitura nunca são convertidos para zero milímetros. Se houver falha de qualidade ou divergência excessiva, o sistema bloqueia o pagamento automático e cria uma excepção para investigação do operador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#171717]">
              3. Gatilhos Paramétricos e Faixas de Severidade
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#737373]">
              No momento da subscrição, os parâmetros do produto (limiar de seca ou excesso de chuva, janela de observação e tabela de percentagens) são copiados de forma imutável para os termos da apólice. Alterações futuras ao produto não afectam contratos já emitidos.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
                  <tr>
                    <th className="px-4 py-3">Classificação do Desvio</th>
                    <th className="px-4 py-3">Faixa de Desvio face ao Gatilho</th>
                    <th className="px-4 py-3 text-right">Indemnização (% Capital)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  <tr>
                    <td className="px-4 py-2.5">Dentro do intervalo normal</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">0% a 10%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Desvio moderado</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">10% a 25%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">25%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Desvio significativo</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">25% a 45%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">50%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Desvio severo</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">45% a 65%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">75%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Desvio extremo</td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums">&ge; 65%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#171717]">
              4. Compreender o Risco de Base
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#737373]">
              Existe risco de base sempre que o índice meteorológico medido por satélite ou reanálise difere da realidade agronómica exacta da parcela (por exemplo, um veranico curto durante a floração dentro de um mês com boa média pluviométrica). Por isso, a plataforma inclui um módulo administrativo específico de análise histórica e teste de risco de base.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8]"
          >
            Experimentar Simulador
          </Link>
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-medium text-[#171717] hover:bg-[#F8F9FA]"
          >
            Consultar Produtos
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
