import { generateId } from '@/lib/store/database'
import type { ClimateValidationSummary } from '@/services/climate/validation'
import type {
  ClimateEvent,
  ClimateSourceComparison,
  EventStatus,
  InsurancePolicy,
  OperationalException,
} from '@/types/domain'

export interface TriggerEvaluationInput {
  policy: InsurancePolicy
  windowStart: string
  windowEnd: string
  validation: ClimateValidationSummary
  comparison: ClimateSourceComparison | null
  existingEvents: ClimateEvent[]
  isSimulatedScenario: boolean
}

export interface TriggerEvaluationOutput {
  duplicatePrevented: boolean
  event: ClimateEvent
  exception: OperationalException | null
  triggerActivated: boolean
}

/**
 * Avalia o gatilho paramétrico contratual de uma apólice activa para uma janela temporal específica.
 *
 * Regras de segurança e auditabilidade:
 * - Utiliza EXCLUSIVAMENTE `policy.contractTerms` (cópia imutável feita na subscrição).
 * - Previne duplicação através de chave determinística `eventKey = policyId:windowStart:windowEnd:coverageType`.
 * - Se a qualidade de dados falhar ou houver discordância entre fontes climáticas,
 *   NUNCA activa indemnização automática; cria uma excepção operacional para o operador.
 */
export function evaluateParametricTrigger(
  input: TriggerEvaluationInput
): TriggerEvaluationOutput {
  const {
    policy,
    windowStart,
    windowEnd,
    validation,
    comparison,
    existingEvents,
    isSimulatedScenario,
  } = input

  const terms = policy.contractTerms
  const eventKey = `${policy.id}:${windowStart}:${windowEnd}:${terms.coverageType}`
  const existing = existingEvents.find((e) => e.eventKey === eventKey)

  // Prevenção de eventos duplicados (Cenário 16 do Master Prompt)
  if (existing) {
    return {
      duplicatePrevented: true,
      event: existing,
      exception: null,
      triggerActivated: false,
    }
  }

  const nowIso = new Date().toISOString()
  const observedMm = validation.accumulatedPrecipitationMm
  const evidenceSummary = [
    `Fonte primária: ${observedMm !== null ? `${observedMm} mm` : 'Indisponível'}`,
    `Cobertura: ${validation.completenessPercent}% (${validation.validDays}/${validation.expectedDays} dias)`,
    comparison
      ? `Confirmação: ${comparison.secondaryAccumulatedMm ?? 'N/D'} mm (Desacordo: ${comparison.disagreementPercent ?? 'N/D'}%)`
      : 'Sem comparação secundária concluída',
  ].join(' | ')

  // 1. Verificar falhas de qualidade de dados na fonte primária
  if (!validation.passed || observedMm === null) {
    const event: ClimateEvent = {
      id: generateId('evt'),
      eventKey,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      customerName: policy.customerName,
      farmId: policy.farmId,
      farmName: policy.farmName,
      province: policy.province,
      coverageType: terms.coverageType,
      windowStart,
      windowEnd,
      observedPrecipitationMm: observedMm,
      contractualThresholdMm: terms.triggerThresholdMm,
      dataQualityStatus: validation.qualityStatus,
      comparisonId: comparison?.id ?? null,
      status: 'exception',
      ruleAppliedExplanation: `Bloqueio preventivo de qualidade de dados: ${validation.issues.join(' ') || 'Série climática incompleta.'}`,
      indemnityCalculationId: null,
      calculatedIndemnityAoa: null,
      evidenceSummary,
      isSimulatedScenario,
      detectedAt: nowIso,
      updatedAt: nowIso,
    }

    const exception: OperationalException = {
      id: generateId('exc'),
      eventId: event.id,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      farmName: policy.farmName,
      reasonCode:
        validation.qualityStatus === 'invalid_values'
          ? 'invalid_values'
          : 'insufficient_data',
      severity: 'critical',
      description: `Qualidade insuficiente (${validation.completenessPercent}% válida) na janela ${windowStart} a ${windowEnd}. ${validation.issues.join(' ')}`,
      status: 'open',
      assignedOperatorId: null,
      decisionReason: null,
      previousEventStatus: 'data_validation_pending',
      resolvedAt: null,
      createdAt: nowIso,
    }

    return {
      duplicatePrevented: false,
      event,
      exception,
      triggerActivated: false,
    }
  }

  // 2. Verificar discordância entre fontes climáticas (ex: Open-Meteo vs NASA POWER)
  if (comparison && !comparison.passed) {
    const event: ClimateEvent = {
      id: generateId('evt'),
      eventKey,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      customerName: policy.customerName,
      farmId: policy.farmId,
      farmName: policy.farmName,
      province: policy.province,
      coverageType: terms.coverageType,
      windowStart,
      windowEnd,
      observedPrecipitationMm: observedMm,
      contractualThresholdMm: terms.triggerThresholdMm,
      dataQualityStatus: 'source_disagreement',
      comparisonId: comparison.id,
      status: 'exception',
      ruleAppliedExplanation: `Bloqueio por discordância entre fontes meteorológicas: ${comparison.notes}`,
      indemnityCalculationId: null,
      calculatedIndemnityAoa: null,
      evidenceSummary,
      isSimulatedScenario,
      detectedAt: nowIso,
      updatedAt: nowIso,
    }

    const exception: OperationalException = {
      id: generateId('exc'),
      eventId: event.id,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      farmName: policy.farmName,
      reasonCode: 'source_disagreement',
      severity: 'high',
      description: comparison.notes,
      status: 'open',
      assignedOperatorId: null,
      decisionReason: null,
      previousEventStatus: 'data_validation_pending',
      resolvedAt: null,
      createdAt: nowIso,
    }

    return {
      duplicatePrevented: false,
      event,
      exception,
      triggerActivated: false,
    }
  }

  // 3. Avaliar o gatilho paramétrico contratual (Seca vs Excesso de Chuva)
  const triggered =
    terms.coverageType === 'drought'
      ? observedMm < terms.triggerThresholdMm
      : observedMm > terms.triggerThresholdMm

  const status: EventStatus = triggered
    ? 'trigger_activated'
    : 'trigger_not_activated'

  const ruleAppliedExplanation = triggered
    ? terms.coverageType === 'drought'
      ? `Gatilho de seca activado: precipitação acumulada observada (${observedMm.toFixed(1)} mm) inferior ao limiar contratual (${terms.triggerThresholdMm.toFixed(1)} mm).`
      : `Gatilho de excesso de chuva activado: precipitação acumulada observada (${observedMm.toFixed(1)} mm) superior ao limiar contratual (${terms.triggerThresholdMm.toFixed(1)} mm).`
    : terms.coverageType === 'drought'
      ? `Gatilho não activado: precipitação observada (${observedMm.toFixed(1)} mm) igual ou superior ao limiar de seca (${terms.triggerThresholdMm.toFixed(1)} mm).`
      : `Gatilho não activado: precipitação observada (${observedMm.toFixed(1)} mm) igual ou inferior ao limiar de excesso (${terms.triggerThresholdMm.toFixed(1)} mm).`

  const event: ClimateEvent = {
    id: generateId('evt'),
    eventKey,
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    customerId: policy.customerId,
    customerName: policy.customerName,
    farmId: policy.farmId,
    farmName: policy.farmName,
    province: policy.province,
    coverageType: terms.coverageType,
    windowStart,
    windowEnd,
    observedPrecipitationMm: observedMm,
    contractualThresholdMm: terms.triggerThresholdMm,
    dataQualityStatus: 'valid',
    comparisonId: comparison?.id ?? null,
    status,
    ruleAppliedExplanation,
    indemnityCalculationId: null,
    calculatedIndemnityAoa: triggered ? null : 0,
    evidenceSummary,
    isSimulatedScenario,
    detectedAt: nowIso,
    updatedAt: nowIso,
  }

  return {
    duplicatePrevented: false,
    event,
    exception: null,
    triggerActivated: triggered,
  }
}
