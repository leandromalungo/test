import Link from 'next/link'

/**
 * Barra de navegação pública estrita em 3 zonas:
 * 1. Marca institucional (1 linha)
 * 2. 4 ligações concisas de navegação
 * 3. 1 acção primária
 */
export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-[#171717] whitespace-nowrap shrink-0"
        >
          NOSSA AgroParamétrico
        </Link>

        <nav
          aria-label="Navegação pública"
          className="hidden items-center gap-6 text-sm font-medium text-[#737373] md:flex"
        >
          <Link
            href="/products"
            className="transition-colors hover:text-[#171717] whitespace-nowrap shrink-0"
          >
            Produtos
          </Link>
          <Link
            href="/how-it-works"
            className="transition-colors hover:text-[#171717] whitespace-nowrap shrink-0"
          >
            Como Funciona
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-[#171717] whitespace-nowrap shrink-0"
          >
            Termos
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-[#171717] whitespace-nowrap shrink-0"
          >
            Privacidade
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
          >
            Portal do Agricultor
          </Link>
        </div>
      </div>
    </header>
  )
}
