import { ANGOLA_BOUNDS } from '@/config/angola'
import type { ClimateDataQualityStatus, ClimateObservation } from '@/types/domain'

export interface ClimateValidationSummary {
  passed: boolean
  qualityStatus: ClimateDataQualityStatus
  expectedDays: number
  receivedDays: number
  validDays: number
  missingDays: number
  invalidDays: number
  duplicateDays: number
  completenessPercent: number
  accumulatedPrecipitationMm: number | null
  issues: string[]
}

/**
 * Calcula o número de dias inclusivo entre duas datas ISO (AAAA-MM-DD).
 */
export function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.floor((end - start) / 86_400_000) + 1
}

/**
 * Valida a qualidade técnica e meteorológica de uma série de observações diárias.
 *
 * Regras críticas implementadas:
 * 1. Dados em falta (`null` ou `NaN`) NUNCA são convertidos para 0 mm.
 * 2. Datas duplicadas para a mesma fonte e coordenada são detectadas e rejeitadas da soma.
 * 3. Valores negativos ou fisicamente implausíveis (> 500 mm/dia) invalidam a série automática.
 * 4. Cobertura inferior ao mínimo contratual (ex: 85%) bloqueia o pagamento automático.
 *
 * @param observations Observações recolhidas para a janela temporal.
 * @param windowStart Data inicial da janela (AAAA-MM-DD).
 * @param windowEnd Data final da janela (AAAA-MM-DD).
 * @param minCompletenessPercent Cobertura mínima exigida pela apólice.
 * @param targetLatitude Latitude esperada da propriedade agrícola.
 * @param targetLongitude Longitude esperada da propriedade agrícola.
 */
export function validateClimateSeries(params: {
  observations: ClimateObservation[]
  windowStart: string
  windowEnd: string
  minCompletenessPercent: number
  targetLatitude: number
  targetLongitude: number
}): ClimateValidationSummary {
  const {
    observations,
    windowStart,
    windowEnd,
    minCompletenessPercent,
    targetLatitude,
    targetLongitude,
  } = params

  const expectedDays = countDaysInclusive(windowStart, windowEnd)
  const issues: string[] = []

  // Verificar coordenadas dentro do território angolano e proximidade da propriedade
  if (
    targetLatitude < ANGOLA_BOUNDS.minLatitude ||
    targetLatitude > ANGOLA_BOUNDS.maxLatitude ||
    targetLongitude < ANGOLA_BOUNDS.minLongitude ||
    targetLongitude > ANGOLA_BOUNDS.maxLongitude
  ) {
    issues.push('Coordenadas da propriedade fora da caixa geográfica de Angola.')
  }

  const seenDates = new Set<string>()
  let duplicateDays = 0
  let missingDays = 0
  let invalidDays = 0
  let validDays = 0
  let accumulated = 0

  const filtered = observations.filter(
    (obs) => obs.observationDate >= windowStart && obs.observationDate <= windowEnd
  )

  for (const obs of filtered) {
    if (seenDates.has(obs.observationDate)) {
      duplicateDays += 1
      continue
    }
    seenDates.add(obs.observationDate)

    // Verifica desalinhamento geográfico superior a ~0.6 graus (~65 km)
    const latDelta = Math.abs(obs.latitude - targetLatitude)
    const lonDelta = Math.abs(obs.longitude - targetLongitude)
    if (latDelta > 0.6 || lonDelta > 0.6) {
      invalidDays += 1
      issues.push(
        `Desvio geográfico excessivo na data ${obs.observationDate} (${obs.latitude}, ${obs.longitude}).`
      )
      continue
    }

    if (obs.unit !== 'mm') {
      invalidDays += 1
      issues.push(`Unidade inválida (${obs.unit}) na data ${obs.observationDate}.`)
      continue
    }

    if (obs.precipitationMm === null || Number.isNaN(obs.precipitationMm)) {
      missingDays += 1
      continue
    }

    if (obs.precipitationMm < 0 || obs.precipitationMm > 500) {
      invalidDays += 1
      issues.push(
        `Valor fisicamente inválido (${obs.precipitationMm} mm) em ${obs.observationDate}.`
      )
      continue
    }

    validDays += 1
    accumulated += obs.precipitationMm
  }

  const unreturnedDays = Math.max(0, expectedDays - seenDates.size)
  const totalMissing = missingDays + unreturnedDays

  const completenessPercent =
    expectedDays > 0
      ? Number(((validDays / expectedDays) * 100).toFixed(2))
      : 0

  let qualityStatus: ClimateDataQualityStatus = 'valid'

  if (duplicateDays > 0) {
    issues.push(`Detectadas ${duplicateDays} observações duplicadas na mesma janela.`)
    qualityStatus = 'duplicate_detected'
  }
  if (invalidDays > 0) {
    qualityStatus = 'invalid_values'
  }
  if (completenessPercent < minCompletenessPercent || expectedDays === 0) {
    issues.push(
      `Cobertura de dados (${completenessPercent}%) inferior ao mínimo contratual de ${minCompletenessPercent}% (${totalMissing} dias sem leitura válida).`
    )
    if (qualityStatus === 'valid') {
      qualityStatus = 'insufficient'
    }
  }

  const passed =
    qualityStatus === 'valid' &&
    issues.length === 0 &&
    completenessPercent >= minCompletenessPercent

  return {
    passed,
    qualityStatus,
    expectedDays,
    receivedDays: seenDates.size,
    validDays,
    missingDays: totalMissing,
    invalidDays,
    duplicateDays,
    completenessPercent,
    // Se a série não atingir o mínimo de qualidade, não devolve acumulado fiável para trigger automático
    accumulatedPrecipitationMm: passed ? Number(accumulated.toFixed(2)) : null,
    issues,
  }
}
