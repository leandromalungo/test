import Link from 'next/link'

/**
 * Rodapé institucional silencioso com ligações legais e contexto do mercado angolano.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-[#F8F9FA]">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#171717]">
            NOSSA AgroParamétrico
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            Plataforma de Seguro Agrícola Paramétrico · Mercado Angolano · Ambiente MVP Demonstrativo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-[#737373]">
          <Link href="/products" className="hover:text-[#171717]">
            Produtos
          </Link>
          <Link href="/how-it-works" className="hover:text-[#171717]">
            Como Funciona
          </Link>
          <Link href="/terms" className="hover:text-[#171717]">
            Condições Contratuais
          </Link>
          <Link href="/privacy" className="hover:text-[#171717]">
            Política de Privacidade
          </Link>
          <Link href="/register" className="hover:text-[#171717]">
            Criar Conta
          </Link>
        </div>
      </div>
    </footer>
  )
}
