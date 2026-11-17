import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface StatusIndicatorProps {
  label: string
  tone?: SemanticTone
  className?: string
}

const TONE_MAP: Record<SemanticTone, string> = {
  neutral: 'border-[#E5E7EB] bg-[#F8F9FA] text-[#525252]',
  info: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
  success: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  warning: 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]',
  danger: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
}

function ToneIcon({ tone }: { tone: SemanticTone }) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    case 'danger':
      return <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    case 'info':
      return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    default:
      return <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  }
}

/**
 * Indicador de estado acessível com ícone e texto explícito.
 * Evita sinalização exclusiva por cor em conformidade com WCAG AA.
 */
export function StatusBadge({
  label,
  tone = 'neutral',
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0',
        TONE_MAP[tone],
        className
      )}
    >
      <ToneIcon tone={tone} />
      <span>{label}</span>
    </span>
  )
}

export function mapPolicyStatusTone(status: string): {
  label: string
  tone: SemanticTone
} {
  switch (status) {
    case 'active':
      return { label: 'Activa', tone: 'success' }
    case 'pending_payment':
      return { label: 'Aguarda Pagamento', tone: 'warning' }
    case 'expired':
      return { label: 'Expirada', tone: 'neutral' }
    case 'cancelled':
      return { label: 'Cancelada', tone: 'danger' }
    default:
      return { label: 'Rascunho', tone: 'neutral' }
  }
}

export function mapEventStatusTone(status: string): {
  label: string
  tone: SemanticTone
} {
  switch (status) {
    case 'paid':
      return { label: 'Indemnização Paga', tone: 'success' }
    case 'indemnity_calculated':
      return { label: 'Indemnização Calculada', tone: 'info' }
    case 'trigger_activated':
      return { label: 'Gatilho Activado', tone: 'warning' }
    case 'trigger_not_activated':
      return { label: 'Sem Gatilho', tone: 'neutral' }
    case 'exception':
      return { label: 'Excepção (Bloqueado)', tone: 'danger' }
    case 'manual_review':
      return { label: 'Em Revisão Manual', tone: 'warning' }
    case 'rejected':
      return { label: 'Rejeitado', tone: 'danger' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

export function mapPaymentStatusTone(status: string): {
  label: string
  tone: SemanticTone
} {
  switch (status) {
    case 'successful':
      return { label: 'Concluído (Simulado)', tone: 'success' }
    case 'failed':
      return { label: 'Falhado', tone: 'danger' }
    case 'processing':
      return { label: 'Em Processamento', tone: 'info' }
    case 'cancelled':
      return { label: 'Cancelado', tone: 'neutral' }
    default:
      return { label: 'Pendente', tone: 'warning' }
  }
}
