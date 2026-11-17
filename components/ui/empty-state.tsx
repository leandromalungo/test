import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

/**
 * Componente padrão de estado vazio com orientação accionável para o utilizador.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#737373]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[#171717]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[#737373]">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
