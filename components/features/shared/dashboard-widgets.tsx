import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CloudRain,
  CreditCard,
  FileCheck2,
  GitCompare,
  MapPin,
  Plus,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SpecialistAvatarStack } from '@/components/ui/specialist-avatar-stack'

export type DashboardIconName =
  | 'drought-sun'
  | 'rain-cloud'
  | 'satellite-radar'
  | 'agro-shield'

export type QuickActionIcon =
  | 'farms'
  | 'simulate'
  | 'climate'
  | 'payments'
  | 'policies'
  | 'monitoring'
  | 'exposure'
  | 'exceptions'
  | 'quality'
  | 'events'

const QUICK_ICON_MAP = {
  farms: MapPin,
  simulate: FileCheck2,
  climate: CloudRain,
  payments: CreditCard,
  policies: FileCheck2,
  monitoring: Activity,
  exposure: TrendingUp,
  exceptions: ShieldAlert,
  quality: GitCompare,
  events: CloudRain,
} as const

export function DashboardPngIcon({
  icon,
  alt,
  size = 28,
}: {
  icon: DashboardIconName
  alt: string
  size?: number
}) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-2xs">
      <Image
        src={`/images/dashboard/${icon}.png`}
        alt={alt}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="h-7 w-7 object-contain"
      />
    </span>
  )
}

interface DashboardHeaderBarProps {
  greeting: string
  subtitle: string
  periodLabel: string
  actionHref: string
  actionLabel: string
  backHref?: string
}

/**
 * Cabeçalho limpo de cada painel de perfil com período e botão primário em cápsula.
 */
export function DashboardHeaderBar({
  greeting,
  subtitle,
  periodLabel,
  actionHref,
  actionLabel,
  backHref = '/',
}: DashboardHeaderBarProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <Link
          href={backHref}
          aria-label="Voltar ao início"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0D1526] sm:text-[26px]">
            {greeting}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 text-[12px] font-medium text-[#525252] whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-[#0D1526]" aria-hidden="true" />
          <span>{periodLabel}</span>
        </span>
        <Link
          href={actionHref}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#C8F135] px-4 text-[12px] font-semibold text-[#0D1526] transition-colors hover:bg-[#B8E324] whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{actionLabel}</span>
        </Link>
      </div>
    </div>
  )
}

export interface HighlightRow {
  title: string
  subtitle: string
  metric: string
  subMetric: string
  icon: DashboardIconName
}

interface StackedHighlightCardsProps {
  title: string
  href: string
  items: [HighlightRow, HighlightRow, HighlightRow]
}

/**
 * Cartão empilhado com 3 faixas contrastantes (Obsidiana, Lima e Cinza Claro)
 * inspirado directamente no bloco esquerdo de carteira/investimentos da referência.
 */
export function StackedHighlightCards({
  title,
  href,
  items,
}: StackedHighlightCardsProps) {
  const rowThemes = [
    'bg-[#0D1321] text-white',
    'bg-[#C8F135] text-[#0D1321]',
    'bg-[#F4F6F9] text-[#0D1526]',
  ] as const

  const subThemes = [
    'text-white/70',
    'text-[#0D1526]/75',
    'text-[#6B7280]',
  ] as const

  return (
    <section className="flex flex-col justify-between rounded-[24px] border border-[#ECEFF3] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[#0D1526]">{title}</h2>
        <Link
          href={href}
          aria-label={`Ver detalhes de ${title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <Link
            key={item.title}
            href={href}
            className={cn(
              'flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 transition-transform duration-150 hover:-translate-y-0.5',
              rowThemes[idx]
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <DashboardPngIcon icon={item.icon} alt={item.title} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{item.title}</p>
                <p className={cn('truncate text-[11px]', subThemes[idx])}>
                  {item.subtitle}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-[13px] font-semibold tabular-nums">
                {item.metric}
              </p>
              <p className={cn('text-[10px] tabular-nums', subThemes[idx])}>
                {item.subMetric}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export interface QuickTileItem {
  label: string
  href: string
  icon: QuickActionIcon
}

interface RingAndProgressCardProps {
  title: string
  href: string
  headlineLabel: string
  headlineValue: string
  ringPercent: number
  ringCenterValue: string
  ringCenterCaption: string
  progressLabel: string
  progressValueText: string
  progressPercent: number
  quickTiles: [QuickTileItem, QuickTileItem, QuickTileItem, QuickTileItem]
}

/**
 * Cartão lateral com saldo/capital principal, atalhos rápidos, anel radial em lima
 * e barra de progresso em cápsula.
 */
export function RingAndProgressCard({
  title,
  href,
  headlineLabel,
  headlineValue,
  ringPercent,
  ringCenterValue,
  ringCenterCaption,
  progressLabel,
  progressValueText,
  progressPercent,
  quickTiles,
}: RingAndProgressCardProps) {
  const clampedRing = Math.max(0, Math.min(100, ringPercent))
  const clampedBar = Math.max(8, Math.min(100, progressPercent))

  return (
    <section className="flex flex-col justify-between rounded-[24px] border border-[#ECEFF3] bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0D1526]">{title}</h2>
          <p className="mt-1 text-[11px] text-[#6B7280]">{headlineLabel}</p>
          <p className="mt-1 font-mono text-[24px] font-semibold tracking-[-0.02em] text-[#0D1526] tabular-nums">
            {headlineValue}
          </p>
        </div>
        <Link
          href={href}
          aria-label={`Abrir ${title}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* 4 botões de acção rápida */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {quickTiles.map((tile) => {
          const Icon = QUICK_ICON_MAP[tile.icon]
          return (
            <Link
              key={tile.href}
              href={tile.href}
              title={tile.label}
              aria-label={tile.label}
              className="flex h-10 flex-col items-center justify-center rounded-xl bg-[#F4F6F9] text-[#0D1526] transition-colors hover:bg-[#E7ECF3]"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </Link>
          )
        })}
      </div>

      {/* Anel radial em lima com fundo tracejado */}
      <div className="my-5 flex items-center justify-between gap-4 rounded-2xl bg-[#F7F9FB] p-3.5">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-[#6B7280]">{progressLabel}</p>
          <p className="font-mono text-[14px] font-semibold text-[#0D1526] tabular-nums">
            {progressValueText}
          </p>
        </div>

        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#B9F23A ${clampedRing * 3.6}deg, #E5EAF1 ${clampedRing * 3.6}deg)`,
          }}
        >
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white text-center shadow-2xs">
            <span className="font-mono text-[13px] font-semibold text-[#0D1526] tabular-nums">
              {ringCenterValue}
            </span>
            <span className="text-[9px] text-[#6B7280]">
              {ringCenterCaption}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progresso horizontal em lima */}
      <div>
        <div className="relative h-5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
          <div
            className="flex h-full items-center justify-end rounded-full bg-[#C8F135] pr-0.5 transition-all duration-300"
            style={{ width: `${clampedBar}%` }}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
          </div>
        </div>
      </div>
    </section>
  )
}

interface CompactSummaryTileProps {
  title: string
  subtitle: string
  metricValue: string
  deltaPill: string
  href: string
  showAvatars?: boolean
  footnote?: string
}

/**
 * Cartão inferior direito compacto com destaque numérico, cápsula positiva em lima
 * e pilha de retratos/indicador de rede.
 */
export function CompactSummaryTile({
  title,
  subtitle,
  metricValue,
  deltaPill,
  href,
  showAvatars = true,
  footnote,
}: CompactSummaryTileProps) {
  return (
    <section className="flex flex-col justify-between rounded-[24px] border border-[#ECEFF3] bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0D1526]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">{subtitle}</p>
        </div>
        <Link
          href={href}
          aria-label={`Abrir ${title}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[26px] font-semibold tracking-[-0.025em] text-[#0D1526] tabular-nums">
          {metricValue}
        </span>
        <span className="inline-flex items-center rounded-full bg-[#D9F96B] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0D1526] tabular-nums">
          {deltaPill}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#F7F9FB] px-3.5 py-2.5">
        {showAvatars ? (
          <SpecialistAvatarStack badgeLabel="AO" borderClassName="border-[#F7F9FB]" />
        ) : null}
        {footnote && (
          <span className="text-[11px] font-medium text-[#525252] truncate">
            {footnote}
          </span>
        )}
      </div>
    </section>
  )
}
