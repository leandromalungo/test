import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LimeActionLinkProps {
  href: string
  label: string
  className?: string
}

/**
 * Botão de acção principal reutilizável no estilo lima institucional da plataforma.
 */
export function LimeActionLink({
  href,
  label,
  className,
}: LimeActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#C8F135] px-5 text-[13px] font-semibold text-[#0D1526] transition-all duration-150 hover:bg-[#B8E324] active:translate-y-px whitespace-nowrap shrink-0',
        className
      )}
    >
      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}
