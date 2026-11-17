import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#171717]">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Condições Gerais e Termos do Seguro Paramétrico
        </h1>
        <p className="text-sm text-[#737373]">
          Versão v1.0-AO · Documento informativo para ambiente MVP de demonstração.
        </p>

        <section className="space-y-2 border-t border-[#E5E7EB] pt-6">
          <h2 className="text-base font-semibold">1. Natureza Paramétrica da Cobertura</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            As apólices emitidas nesta plataforma são contratos paramétricos indexados à precipitação acumulada (mm) medida nas coordenadas geográficas da propriedade registada. O pagamento não depende de peritagem física de perda de colheita, mas sim da verificação do gatilho contratual definido na versão da apólice aceite.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Carácter Simulado no Ambiente MVP</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            Todos os pagamentos de prémios, pagamentos de indemnizações e certificados digitais em PDF emitidos em modo de demonstração são explicitamente identificados como simulados, não gerando obrigação financeira real nem movimentação bancária.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Limitações de Dados e Revisão Operacional</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            Caso as fontes meteorológicas apresentem cobertura inferior ao mínimo contratual ou divergência superior ao limiar acordado, a activação automática é suspensa e o evento segue para análise documental pela equipa de operações.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
