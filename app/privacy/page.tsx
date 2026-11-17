import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#171717]">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Política de Privacidade e Protecção de Dados
        </h1>
        <p className="text-sm text-[#737373]">
          Conformidade técnica com princípios de minimização, isolamento por Row Level Security (RLS) e auditoria imutável.
        </p>

        <section className="space-y-2 border-t border-[#E5E7EB] pt-6">
          <h2 className="text-base font-semibold">1. Dados Recolhidos</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            A plataforma armazena dados de identificação do produtor (nome, e-mail, telefone, NIF), localização geográfica das lavras agrícolas, histórico de simulações, apólices e evidências meteorológicas associadas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Isolamento e Controlo de Acesso</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            Cada agricultor acede exclusivamente às suas propriedades, apólices, notificações e pagamentos. Operadores e gestores possuem acesso restrito às funções de subscrição, monitorização climática e resolução de excepções, com todas as acções registadas em trilha de auditoria imutável.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Dados Fictícios em Demonstração</h2>
          <p className="text-sm leading-relaxed text-[#737373]">
            Os dados iniciais pré-carregados nesta instância são inteiramente fictícios, destinados exclusivamente à validação técnica do sistema.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
