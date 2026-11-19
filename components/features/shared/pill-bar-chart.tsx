'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PillBarPoint {
  label: string
  primaryValue: number
  secondaryValue: number
  formattedPrimary: string
  formattedSecondary: string
}

interface PillBarChartCardProps {
  title: string
  primaryToggleLabel: string
  secondaryToggleLabel: string
  unitLabel: string
  href: string
  points: PillBarPoint[]
}

/**
 * Gráfico interactivo com barras verticais em cápsula azul sobre faixas diagonais tracejadas.
 * Reutilizado nos painéis do Agricultor, Gestor e Operador com alternância de série.
 */
export function PillBarChartCard({
  title,
  primaryToggleLabel,
  secondaryToggleLabel,
  unitLabel,
  href,
  points,
}: PillBarChartCardProps) {
  const [mode, setMode] = useState<'primary' | 'secondary'>('primary')

  const values = points.map((p) =>
    mode === 'primary' ? p.primaryValue : p.secondaryValue
  )
  const maxVal = Math.max(...values, 1)
  const peakIndex = values.indexOf(Math.max(...values))

  return (
    <section className="flex flex-col justify-between rounded-[24px] border border-[#ECEFF3] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4F6F9] text-[#0D1526]">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#0D1526]">{title}</h2>
            <p className="text-[11px] text-[#6B7280]">{unitLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full bg-[#F4F6F9] p-1">
            <button
              type="button"
              onClick={() => setMode('primary')}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                mode === 'primary'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#0D1526]'
              )}
            >
              {primaryToggleLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode('secondary')}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                mode === 'secondary'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#0D1526]'
              )}
            >
              {secondaryToggleLabel}
            </button>
          </div>

          <Link
            href={href}
            aria-label={`Abrir detalhes de ${title}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-xs text-[#6B7280]">
          Sem registos suficientes para gerar o gráfico neste período.
        </div>
      ) : (
        <div className="relative mt-6">
          {/* Linhas de referência horizontais subtis */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-2 bottom-9 flex flex-col justify-between"
          >
            {[0, 1, 2, 3].map((line) => (
              <div
                key={line}
                className="w-full border-b border-dashed border-[#E5E7EB]"
              />
            ))}
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {points.slice(0, 6).map((point, index) => {
              const val =
                mode === 'primary' ? point.primaryValue : point.secondaryValue
              const formatted =
                mode === 'primary'
                  ? point.formattedPrimary
                  : point.formattedSecondary
              const pct = Math.max(12, Math.round((val / maxVal) * 100))
              const isPeak = index === peakIndex && val > 0

              return (
                <div
                  key={`${point.label}-${index}`}
                  className="flex flex-col items-center"
                >
                  <span className="mb-1.5 font-mono text-[10px] font-medium text-[#525252] tabular-nums">
                    {formatted}
                  </span>

                  {/* Faixa tracejada diagonal atrás da cápsula azul */}
                  <div
                    className="relative flex h-40 w-10 items-end overflow-hidden rounded-full p-0.5 sm:w-11"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(135deg, #E5EAF1 0px, #E5EAF1 4px, #F7F9FB 4px, #F7F9FB 9px)',
                    }}
                  >
                    <div
                      className={cn(
                        'w-full rounded-full transition-all duration-300',
                        isPeak ? 'bg-[#1D4ED8]' : 'bg-[#60A5FA]'
                      )}
                      style={{ height: `${pct}%` }}
                    />
                  </div>

                  <span className="mt-2 max-w-full truncate text-[11px] font-medium text-[#6B7280]">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
