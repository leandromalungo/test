import Decimal from 'decimal.js'
import { generateId } from '@/lib/store/database'
import type { ClimateSourceComparison } from '@/types/domain'

export interface SourceComparisonInput {
  farmId: string
  policyId: string | null
  windowStart: string
  windowEnd: string
  primaryProvider: string
  secondaryProvider: string
  primaryAccumulatedMm: number | null
  secondaryAccumulatedMm: number | null
  thresholdPercent: number
}

/**
 * Compara a precipitação acumulada entre a fonte climática primária e a fonte secundária de confirmação.
 *
 * Regra de segurança paramétrica: se o desacordo percentual ultrapassar o limiar máximo
 * definido na apólice, a comparação falha e o evento é bloqueado para revisão manual do operador,
 * preservando todas as evidências de ambas as fontes.
 */
export function compareClimateSources(
  input: SourceComparisonInput
): ClimateSourceComparison {
  const {
    farmId,
    policyId,
    windowStart,
    windowEnd,
    primaryProvider,
    secondaryProvider,
    primaryAccumulatedMm,
    secondaryAccumulatedMm,
    thresholdPercent,
  } = input

  if (primaryAccumulatedMm === null || secondaryAccumulatedMm === null) {
    return {
      id: generateId('comp'),
      farmId,
      policyId,
      windowStart,
      windowEnd,
      primaryProvider,
      secondaryProvider,
      primaryAccumulatedMm,
      secondaryAccumulatedMm,
      disagreementPercent: null,
      disagreementAbsoluteMm: null,
      thresholdPercent,
      passed: false,
      notes:
        'Comparação inconclusiva: uma das fontes não apresentou cobertura mínima de dados válidos.',
      createdAt: new Date().toISOString(),
    }
  }

  const p = new Decimal(primaryAccumulatedMm)
  const s = new Decimal(secondaryAccumulatedMm)
  const absDelta = p.minus(s).abs()
  const denominator = Decimal.max(p, s, new Decimal(1))
  const disagreementPercent = absDelta
    .div(denominator)
    .times(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  // Se ambas as fontes indicam chuva muito baixa (< 15 mm no período) com diferença < 5 mm, evita falso alarme percentual
  const negligibleLowRainDelta =
    p.lte(15) && s.lte(15) && absDelta.lte(5)

  const passed =
    negligibleLowRainDelta || disagreementPercent.lte(thresholdPercent)

  return {
    id: generateId('comp'),
    farmId,
    policyId,
    windowStart,
    windowEnd,
    primaryProvider,
    secondaryProvider,
    primaryAccumulatedMm: p.toNumber(),
    secondaryAccumulatedMm: s.toNumber(),
    disagreementPercent: disagreementPercent.toNumber(),
    disagreementAbsoluteMm: absDelta.toDecimalPlaces(2).toNumber(),
    thresholdPercent,
    passed,
    notes: passed
      ? `Fontes concordantes: desvio de ${disagreementPercent.toFixed(2)}% dentro do limiar de ${thresholdPercent}%.`
      : `Discordância crítica de ${disagreementPercent.toFixed(2)}% (${absDelta.toFixed(1)} mm) excede o limiar máximo de ${thresholdPercent}%.`,
    createdAt: new Date().toISOString(),
  }
}
