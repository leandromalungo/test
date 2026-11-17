'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ClimateObservation } from '@/types/domain'

interface PrecipitationChartProps {
  observations: ClimateObservation[]
  title?: string
}

/**
 * Gráfico de barras diário para precipitação normalizada em milímetros (mm).
 * Distingue visualmente observações em falta (`null`), que nunca são desenhadas como zero fictício.
 */
export function PrecipitationChart({
  observations,
  title = 'Precipitação Diária Observada (mm)',
}: PrecipitationChartProps) {
  const sorted = [...observations]
    .sort((a, b) => a.observationDate.localeCompare(b.observationDate))
    .slice(-45)

  const chartData = sorted.map((obs) => ({
    date: obs.observationDate.slice(5),
    mm: obs.precipitationMm ?? 0,
    isMissing: obs.precipitationMm === null,
    provider: obs.providerName,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] text-sm text-[#737373]">
        Sem série pluviométrica para apresentar neste intervalo.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
        <span className="font-mono text-xs text-[#737373] tabular-nums">
          {chartData.length} dias exibidos
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#737373' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#737373' }}
              tickLine={false}
              axisLine={false}
              unit=" mm"
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)} mm`, 'Precipitação']}
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="mm" fill="#2563EB" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
