import Decimal from 'decimal.js'
import { generateId } from '@/lib/store/database'
import type {
  ClimateEvent,
  IndemnityCalculation,
  InsurancePolicy,
  SeverityBand,
} from '@/types/domain'

export interface IndemnityInput {
  event: ClimateEvent
  policy: InsurancePolicy
  observedPrecipitationMm: number
}

/**
 * Calcula o valor da indemnização com base nas regras contratuais imutáveis
 * gravadas na apólice (`policy.contractTerms`) e na severidade do evento climático.
 *
 * O cálculo é executado exclusivamente no servidor utilizando Decimal.js para
 * impedir erros de vírgula flutuante ou manipulação pelo cliente.
 *
 * O resultado nunca pode ultrapassar o capital segurado nem o tecto máximo contratual.
 *
 * @param input Evento climático validado, apólice activa e precipitação observada em mm.
 * @returns Cálculo detalhado e auditável da indemnização devida em Kwanzas (AOA).
 */
export function calculateIndemnity(input: IndemnityInput): IndemnityCalculation {
  const { event, policy, observedPrecipitationMm } = input
  const terms = policy.contractTerms
  const threshold = new Decimal(terms.triggerThresholdMm)
  const observed = new Decimal(observedPrecipitationMm)
  const capital = new Decimal(policy.insuredCapitalAoa)

  let deviationPercent = new Decimal(0)
  if (terms.coverageType === 'drought' && observed.lt(threshold)) {
    deviationPercent = threshold.minus(observed).div(threshold).times(100)
  } else if (terms.coverageType === 'excess_rain' && observed.gt(threshold)) {
    deviationPercent = observed.minus(threshold).div(threshold).times(100)
  }

  const roundedDeviation = deviationPercent.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  // Seleciona a faixa de severidade aplicável nas regras copiadas para a apólice
  let matchedBand: SeverityBand = terms.severityBands[0] || {
    id: 'default',
    label: 'Dentro do intervalo normal',
    minDeviationPercent: 0,
    maxDeviationPercent: 10,
    payoutPercentage: 0,
  }

  for (const band of terms.severityBands) {
    const meetsMin = roundedDeviation.gte(band.minDeviationPercent)
    const meetsMax =
      band.maxDeviationPercent === null ||
      roundedDeviation.lt(band.maxDeviationPercent)
    if (meetsMin && meetsMax) {
      matchedBand = band
      break
    }
  }

  const payoutPct = Decimal.min(new Decimal(matchedBand.payoutPercentage), new Decimal(100))
  const rawIndemnity = capital
    .times(payoutPct.div(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  const cappedAtMaximum = rawIndemnity.gt(capital)
  const finalIndemnity = cappedAtMaximum ? capital : rawIndemnity

  const directionLabel =
    terms.coverageType === 'drought' ? 'abaixo do gatilho' : 'acima do gatilho'

  return {
    id: generateId('ind'),
    eventId: event.id,
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    insuredCapitalAoa: capital.toNumber(),
    observedPrecipitationMm: observed.toDecimalPlaces(2).toNumber(),
    contractualThresholdMm: threshold.toNumber(),
    deviationPercent: roundedDeviation.toNumber(),
    severityLabel: matchedBand.label,
    payoutPercentage: payoutPct.toNumber(),
    calculatedIndemnityAoa: finalIndemnity.toNumber(),
    cappedAtMaximum,
    explanation: `Fórmula: Capital Segurado (${capital.toFixed(2)} AOA) × ${payoutPct.toFixed(0)}% = ${finalIndemnity.toFixed(2)} AOA. Precipitação observada (${observed.toFixed(1)} mm) registou desvio de ${roundedDeviation.toFixed(2)}% ${directionLabel} contratual (${threshold.toFixed(1)} mm), enquadrando-se na faixa "${matchedBand.label}".`,
    evidenceSummary: event.evidenceSummary,
    calculatedAt: new Date().toISOString(),
  }
}
