import Link from 'next/link'
import { Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  href?: string
  tone?: 'light' | 'dark'
  subtitle?: string
  className?: string
}

/**
 * Marca institucional única reutilizada na barra pública, rodapé e portais internos.
 */
export function BrandMark({
  href = '/',
  tone = 'dark',
  subtitle,
  className,
}: BrandMarkProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5 shrink-0', className)}>
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8F135] text-[#0D1526]"
      >
        <Sprout className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            'text-[16px] font-semibold tracking-[-0.02em] whitespace-nowrap',
            tone === 'light' ? 'text-white' : 'text-[#0D1526]'
          )}
        >
          NOSSA AgroParamétrico
        </span>
        {subtitle && (
          <span
            className={cn(
              'text-[11px] font-normal',
              tone === 'light' ? 'text-white/75' : 'text-[#737373]'
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )

  if (!href) {
    return content
  }

  return (
    <Link href={href} className="inline-flex items-center shrink-0">
      {content}
    </Link>
  )
}
