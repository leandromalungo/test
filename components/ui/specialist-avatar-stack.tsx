import Image from 'next/image'
import { cn } from '@/lib/utils'

const SPECIALISTS = [
  {
    src: '/images/landing/avatar-1.jpg',
    alt: 'Engenheira agrónoma da rede NOSSA AgroParamétrico',
  },
  {
    src: '/images/landing/avatar-2.jpg',
    alt: 'Produtor rural angolano parceiro da plataforma',
  },
  {
    src: '/images/landing/avatar-3.jpg',
    alt: 'Especialista em meteorologia aplicada da NOSSA AgroParamétrico',
  },
] as const

interface SpecialistAvatarStackProps {
  badgeLabel?: string
  borderClassName?: string
  className?: string
}

/**
 * Grupo reutilizável de retratos circulares sobrepostos usado no Hero e na secção Sobre.
 */
export function SpecialistAvatarStack({
  badgeLabel,
  borderClassName = 'border-white',
  className,
}: SpecialistAvatarStackProps) {
  return (
    <div className={cn('inline-flex items-center', className)}>
      <div className="flex -space-x-2">
        {SPECIALISTS.map((person) => (
          <div
            key={person.src}
            className={cn(
              'relative h-7 w-7 overflow-hidden rounded-full border-2 bg-[#1E293B]',
              borderClassName
            )}
          >
            <Image
              src={person.src}
              alt={person.alt}
              fill
              sizes="28px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
        ))}
        {badgeLabel && (
          <span
            className={cn(
              'relative z-10 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 bg-[#C8F135] px-1.5 text-[10px] font-semibold text-[#0D1526] tabular-nums',
              borderClassName
            )}
          >
            {badgeLabel}
          </span>
        )}
      </div>
    </div>
  )
}
