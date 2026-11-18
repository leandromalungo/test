import Link from 'next/link'
import { BrandMark } from '@/components/layout/brand-mark'

/**
 * Rodapé institucional único importado pelas páginas públicas e pela página de apresentação.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <BrandMark href="/#inicio" tone="dark" />
          <p className="mt-2 text-xs text-[#6B7280]">
            Seguro Agrícola Paramétrico · Mercado Angolano · Dados Open-Meteo ERA5 &amp; NASA POWER
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#525252]">
          <a href="/#sobre" className="transition-colors hover:text-[#0D1526]">
            Sobre Nós
          </a>
          <a href="/#solucoes" className="transition-colors hover:text-[#0D1526]">
            Soluções
          </a>
          <a href="/#beneficios" className="transition-colors hover:text-[#0D1526]">
            Benefícios
          </a>
          <Link href="/login" className="transition-colors hover:text-[#0D1526]">
            Portal do Agricultor
          </Link>
          <Link href="/admin/login" className="transition-colors hover:text-[#0D1526]">
            Gestor
          </Link>
          <Link href="/operations/login" className="transition-colors hover:text-[#0D1526]">
            Operador
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[#0D1526]">
            Termos
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[#0D1526]">
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  )
}
