'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { BrandMark } from '@/components/layout/brand-mark'
import { cn } from '@/lib/utils'

const ANCHOR_ITEMS = [
  { label: 'Início', anchor: '#inicio' },
  { label: 'Sobre Nós', anchor: '#sobre' },
  { label: 'Soluções', anchor: '#solucoes' },
  { label: 'Benefícios', anchor: '#beneficios' },
] as const

/**
 * Barra de navegação pública única de todo o projecto.
 * Adapta-se automaticamente ao modo transparente sobre o Hero na página inicial (`/`)
 * e ao modo sólido nas restantes páginas públicas, mantendo ligações por âncora.
 */
export function PublicNavbar() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [mobileOpen, setMobileOpen] = useState(false)

  const resolveAnchorHref = (anchor: string) => (isHome ? anchor : `/${anchor}`)

  return (
    <header
      className={cn(
        'w-full transition-colors',
        isHome
          ? 'absolute inset-x-0 top-0 z-30'
          : 'sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm'
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <BrandMark tone={isHome ? 'light' : 'dark'} />

        <nav
          aria-label="Navegação principal"
          className={cn(
            'hidden items-center gap-7 text-[13px] font-medium md:flex',
            isHome ? 'text-white/90' : 'text-[#525252]'
          )}
        >
          {ANCHOR_ITEMS.map((item) => (
            <a
              key={item.anchor}
              href={resolveAnchorHref(item.anchor)}
              className={cn(
                'transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4',
                isHome ? 'hover:text-white' : 'hover:text-[#0D1526]'
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex shrink-0">
          <Link
            href="/login"
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0',
              isHome
                ? 'bg-white text-[#0D1526] hover:bg-[#F3F4F6]'
                : 'bg-[#0D1526] text-white hover:bg-[#1E293B]'
            )}
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-full border px-4 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0',
              isHome
                ? 'border-white/60 text-white hover:bg-white/15'
                : 'border-[#D1D5DB] text-[#0D1526] hover:bg-[#F3F4F6]'
            )}
          >
            Registo
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-full border md:hidden',
            isHome
              ? 'border-white/35 bg-white/10 text-white'
              : 'border-[#E5E7EB] bg-white text-[#0D1526]'
          )}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          className={cn(
            'border-b px-4 pb-5 pt-2 md:hidden',
            isHome
              ? 'border-white/15 bg-[#0A3A75]/95 text-white backdrop-blur-md'
              : 'border-[#E5E7EB] bg-white text-[#0D1526]'
          )}
        >
          <nav aria-label="Navegação móvel" className="flex flex-col gap-3 text-sm font-medium">
            {ANCHOR_ITEMS.map((item) => (
              <a
                key={item.anchor}
                href={resolveAnchorHref(item.anchor)}
                onClick={() => setMobileOpen(false)}
                className="py-1"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2.5 pt-2 border-t border-current/15">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[#C8F135] px-4 text-xs font-semibold text-[#0D1526]"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'inline-flex h-9 flex-1 items-center justify-center rounded-full border px-4 text-xs font-medium',
                  isHome
                    ? 'border-white/50 text-white'
                    : 'border-[#D1D5DB] text-[#0D1526]'
                )}
              >
                Registo
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
