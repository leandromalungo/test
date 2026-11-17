import { generateId, getDemoDatabase, saveDemoDatabase } from '@/lib/store/database'
import {
  isSupabaseConfigured,
  requireSupabaseAdminClient,
} from '@/lib/supabase/server'
import {
  loadPlatformState,
  repoSaveClimateComparison,
  repoSaveClimateObservations,
} from '@/lib/repositories/platform-repository'
import { openMeteoAdapter } from '@/services/climate/providers/open-meteo'
import { nasaPowerAdapter } from '@/services/climate/providers/nasa-power'
import { validateClimateSeries } from '@/services/climate/validation'
import { compareClimateSources } from '@/services/climate/comparison'
import { evaluateParametricTrigger } from '@/services/triggers/trigger-engine'
import { calculateIndemnity } from '@/services/indemnities/indemnity-engine'
import { recordAuditLog } from '@/services/audit/audit-service'
import type {
  ClimateEvent,
  ClimateObservation,
  IndemnityCalculation,
  InsurancePolicy,
  OperationalException,
  UserRole,
} from '@/types/domain'

export type MonitoringScenario =
  | 'live_or_stored'
  | 'normal_no_trigger'
  | 'drought_trigger'
  | 'excess_rain_trigger'
  | 'insufficient_data'
  | 'source_disagreement'

export interface MonitoringRunInput {
  policyId?: string
  scenario: MonitoringScenario
  actorUserId: string | null
  actorEmail: string | null
  actorRole: UserRole | 'system'
}

export interface MonitoringRunReport {
  policiesEvaluated: number
  eventsCreated: ClimateEvent[]
  duplicatesPrevented: number
  indemnitiesCalculated: IndemnityCalculation[]
  exceptionsCreated: OperationalException[]
  usedLiveExternalApi: boolean
  summary: string
}

function generateScenarioSeries(params: {
  policy: InsurancePolicy
  scenario: MonitoringScenario
  windowStart: string
  days: number
}): {
  primary: ClimateObservation[]
  secondary: ClimateObservation[]
} {
  const { policy, scenario, windowStart, days } = params
  const threshold = policy.contractTerms.triggerThresholdMm
  const base = new Date(`${windowStart}T00:00:00Z`)
  const primary: ClimateObservation[] = []
  const secondary: ClimateObservation[] = []
  const nowIso = new Date().toISOString()

  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    const obsDate = d.toISOString().slice(0, 10)

    let pVal: number | null = 4.5
    let sVal: number | null = 4.3

    if (scenario === 'normal_no_trigger') {
      const targetDaily =
        policy.contractTerms.coverageType === 'drought'
          ? (threshold * 1.45) / days
          : (threshold * 0.65) / days
      pVal = Number(targetDaily.toFixed(2))
      sVal = Number((targetDaily * 0.96).toFixed(2))
    } else if (scenario === 'drought_trigger') {
      const targetDaily = (threshold * 0.45) / days
      pVal = Number(targetDaily.toFixed(2))
      sVal = Number((targetDaily * 1.04).toFixed(2))
    } else if (scenario === 'excess_rain_trigger') {
      const targetDaily = (threshold * 1.42) / days
      pVal = Number(targetDaily.toFixed(2))
      sVal = Number((targetDaily * 0.95).toFixed(2))
    } else if (scenario === 'insufficient_data') {
      pVal = i % 3 === 0 ? null : 2.8
      sVal = i % 3 === 0 ? null : 2.7
    } else if (scenario === 'source_disagreement') {
      pVal = Number(((threshold * 1.35) / days).toFixed(2))
      sVal = Number(((threshold * 0.48) / days).toFixed(2))
    }

    primary.push({
      id: `obs-sim-om-${policy.id}-${obsDate}`,
      providerCode: 'open_meteo_era5',
      providerName: 'Open-Meteo ERA5 / ERA5-Land',
      latitude: policy.latitude,
      longitude: policy.longitude,
      observationDate: obsDate,
      precipitationMm: pVal,
      unit: 'mm',
      retrievedAt: nowIso,
      sourceUrl: `demo://scenario/${scenario}/open_meteo_era5`,
      spatialResolution: '~9 km (Cenário Simulado)',
      qualityStatus: pVal === null ? 'insufficient' : 'valid',
      isSimulatedData: true,
      rawPayloadReference: `sim-${scenario}-${obsDate}`,
      validationNotes:
        pVal === null
          ? ['Dia sem observação (cenário de dados insuficientes).']
          : ['Observação gerada em modo de cenário demonstrativo explícito.'],
    })

    secondary.push({
      id: `obs-sim-np-${policy.id}-${obsDate}`,
      providerCode: 'nasa_power',
      providerName: 'NASA POWER Daily Agroclimatology',
      latitude: policy.latitude,
      longitude: policy.longitude,
      observationDate: obsDate,
      precipitationMm: sVal,
      unit: 'mm',
      retrievedAt: nowIso,
      sourceUrl: `demo://scenario/${scenario}/nasa_power`,
      spatialResolution: '~50 km (Cenário Simulado)',
      qualityStatus: sVal === null ? 'insufficient' : 'valid',
      isSimulatedData: true,
      rawPayloadReference: `sim-${scenario}-np-${obsDate}`,
      validationNotes: ['Observação secundária de cenário demonstrativo explícito.'],
    })
  }

  return { primary, secondary }
}

/**
 * Motor de monitorização climática para apólices activas.
 * Totalmente integrado ao PostgreSQL do Supabase quando configurado.
 */
export async function runClimateMonitoring(
  input: MonitoringRunInput
): Promise<MonitoringRunReport> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const state = await loadPlatformState()
    const activePolicies = state.policies.filter((p) =>
      input.policyId ? p.id === input.policyId : p.status === 'active'
    )

    const existingEvents = [...state.climateEvents]
    const eventsCreated: ClimateEvent[] = []
    const indemnitiesCalculated: IndemnityCalculation[] = []
    const exceptionsCreated: OperationalException[] = []
    let duplicatesPrevented = 0
    let usedLiveExternalApi = false

    for (const policy of activePolicies) {
      const windowDays = policy.contractTerms.observationWindowDays
      const endAnchor = new Date(Date.now() - 7 * 86_400_000)
      const startAnchor = new Date(endAnchor.getTime() - (windowDays - 1) * 86_400_000)
      const defaultEnd = endAnchor.toISOString().slice(0, 10)
      const defaultStart = startAnchor.toISOString().slice(0, 10)

      let primaryObs: ClimateObservation[] = []
      let secondaryObs: ClimateObservation[] = []
      let effectiveStart = defaultStart
      let effectiveEnd = defaultEnd
      let isSimulatedScenario = input.scenario !== 'live_or_stored'

      if (input.scenario === 'live_or_stored') {
        const [omRes, npRes] = await Promise.all([
          openMeteoAdapter.fetchDailyPrecipitation({
            latitude: policy.latitude,
            longitude: policy.longitude,
            startDate: defaultStart,
            endDate: defaultEnd,
          }),
          nasaPowerAdapter.fetchDailyPrecipitation({
            latitude: policy.latitude,
            longitude: policy.longitude,
            startDate: defaultStart,
            endDate: defaultEnd,
          }),
        ])

        if (!omRes.error && omRes.observations.length > 0) {
          primaryObs = omRes.observations
          usedLiveExternalApi = true
          await repoSaveClimateObservations({
            observations: primaryObs,
            farmId: policy.farmId,
            providerCode: 'open_meteo_era5',
            requestUrl: omRes.sourceUrl,
            windowStart: defaultStart,
            windowEnd: defaultEnd,
            isSimulatedData: false,
          })
        }

        if (!npRes.error && npRes.observations.length > 0) {
          secondaryObs = npRes.observations
          usedLiveExternalApi = true
          await repoSaveClimateObservations({
            observations: secondaryObs,
            farmId: policy.farmId,
            providerCode: 'nasa_power',
            requestUrl: npRes.sourceUrl,
            windowStart: defaultStart,
            windowEnd: defaultEnd,
            isSimulatedData: false,
          })
        }

        if (primaryObs.length === 0) {
          const storedPrimary = state.climateObservations.filter(
            (o) =>
              o.providerCode === 'open_meteo_era5' &&
              Math.abs(o.latitude - policy.latitude) < 0.1 &&
              Math.abs(o.longitude - policy.longitude) < 0.1
          )
          if (storedPrimary.length > 0) {
            primaryObs = storedPrimary.slice(0, windowDays)
          } else {
            const fallback = generateScenarioSeries({
              policy,
              scenario: 'normal_no_trigger',
              windowStart: defaultStart,
              days: windowDays,
            })
            primaryObs = fallback.primary
            secondaryObs = fallback.secondary
            isSimulatedScenario = true
          }
        }

        effectiveStart = primaryObs[0]?.observationDate || defaultStart
        effectiveEnd = primaryObs[primaryObs.length - 1]?.observationDate || defaultEnd
      } else {
        const scenarioStart =
          input.scenario === 'drought_trigger'
            ? '2026-10-01'
            : input.scenario === 'excess_rain_trigger'
              ? '2026-10-12'
              : input.scenario === 'insufficient_data'
                ? '2026-10-05'
                : input.scenario === 'source_disagreement'
                  ? '2026-10-08'
                  : '2026-10-02'
        const sEnd = new Date(`${scenarioStart}T00:00:00Z`)
        sEnd.setUTCDate(sEnd.getUTCDate() + windowDays - 1)
        effectiveStart = scenarioStart
        effectiveEnd = sEnd.toISOString().slice(0, 10)

        const generated = generateScenarioSeries({
          policy,
          scenario: input.scenario,
          windowStart: effectiveStart,
          days: windowDays,
        })
        primaryObs = generated.primary
        secondaryObs = generated.secondary
      }

      const validation = validateClimateSeries({
        observations: primaryObs,
        windowStart: effectiveStart,
        windowEnd: effectiveEnd,
        minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
        targetLatitude: policy.latitude,
        targetLongitude: policy.longitude,
      })

      let savedComparison = null
      if (secondaryObs.length > 0) {
        const secVal = validateClimateSeries({
          observations: secondaryObs,
          windowStart: effectiveStart,
          windowEnd: effectiveEnd,
          minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
          targetLatitude: policy.latitude,
          targetLongitude: policy.longitude,
        })
        const comparisonDraft = compareClimateSources({
          farmId: policy.farmId,
          policyId: policy.id,
          windowStart: effectiveStart,
          windowEnd: effectiveEnd,
          primaryProvider: 'Open-Meteo ERA5 / ERA5-Land',
          secondaryProvider: 'NASA POWER Daily Agroclimatology',
          primaryAccumulatedMm: validation.accumulatedPrecipitationMm,
          secondaryAccumulatedMm: secVal.accumulatedPrecipitationMm,
          thresholdPercent: policy.contractTerms.maxSourceDisagreementPercent,
        })
        savedComparison = await repoSaveClimateComparison(comparisonDraft)
      }

      const evaluation = evaluateParametricTrigger({
        policy,
        windowStart: effectiveStart,
        windowEnd: effectiveEnd,
        validation,
        comparison: savedComparison,
        existingEvents,
        isSimulatedScenario,
      })

      if (evaluation.duplicatePrevented) {
        duplicatesPrevented += 1
        await recordAuditLog({
          userId: input.actorUserId,
          userEmail: input.actorEmail,
          userRole: input.actorRole,
          action: 'DUPLICATE_EVENT_PREVENTED',
          entityType: 'climate_event',
          entityId: evaluation.event.id,
          metadata: {
            policyNumber: policy.policyNumber,
            eventKey: evaluation.event.eventKey,
          },
          result: 'blocked',
        })
        continue
      }

      let finalStatus = evaluation.event.status
      let calcDraft: IndemnityCalculation | null = null
      if (
        evaluation.triggerActivated &&
        evaluation.event.observedPrecipitationMm !== null
      ) {
        calcDraft = calculateIndemnity({
          event: evaluation.event,
          policy,
          observedPrecipitationMm: evaluation.event.observedPrecipitationMm,
        })
        finalStatus =
          calcDraft.calculatedIndemnityAoa > 0
            ? 'indemnity_calculated'
            : 'trigger_not_activated'
      }

      const { data: evRow, error: evErr } = await admin
        .from('climate_events')
        .insert({
          event_key: evaluation.event.eventKey,
          policy_id: policy.id,
          customer_id: policy.customerId,
          farm_id: policy.farmId,
          coverage_type: policy.contractTerms.coverageType,
          window_start: effectiveStart,
          window_end: effectiveEnd,
          observed_precipitation_mm: evaluation.event.observedPrecipitationMm,
          contractual_threshold_mm: evaluation.event.contractualThresholdMm,
          data_quality_status: evaluation.event.dataQualityStatus,
          comparison_id: savedComparison?.id ?? null,
          status: finalStatus,
          rule_applied_explanation: evaluation.event.ruleAppliedExplanation,
          evidence_summary: evaluation.event.evidenceSummary,
          is_simulated_scenario: isSimulatedScenario,
        })
        .select('*')
        .single()

      if (evErr) {
        if (evErr.code === '23505') {
          duplicatesPrevented += 1
          continue
        }
        throw new Error(`[Supabase:insert_climate_event] ${evErr.message}`)
      }

      const createdEvent: ClimateEvent = {
        ...evaluation.event,
        id: String(evRow.id),
        comparisonId: savedComparison?.id ?? null,
        status: finalStatus,
        detectedAt: String(evRow.detected_at),
        updatedAt: String(evRow.updated_at),
      }

      if (calcDraft) {
        const { data: indRow, error: indErr } = await admin
          .from('indemnity_calculations')
          .insert({
            event_id: createdEvent.id,
            policy_id: policy.id,
            insured_capital_aoa: calcDraft.insuredCapitalAoa,
            observed_precipitation_mm: calcDraft.observedPrecipitationMm,
            contractual_threshold_mm: calcDraft.contractualThresholdMm,
            deviation_percent: calcDraft.deviationPercent,
            severity_label: calcDraft.severityLabel,
            payout_percentage: calcDraft.payoutPercentage,
            calculated_indemnity_aoa: calcDraft.calculatedIndemnityAoa,
            capped_at_maximum: calcDraft.cappedAtMaximum,
            explanation: calcDraft.explanation,
            evidence_summary: calcDraft.evidenceSummary,
          })
          .select('*')
          .single()

        if (!indErr && indRow) {
          const savedInd: IndemnityCalculation = {
            ...calcDraft,
            id: String(indRow.id),
            eventId: createdEvent.id,
            calculatedAt: String(indRow.calculated_at),
          }
          createdEvent.indemnityCalculationId = savedInd.id
          createdEvent.calculatedIndemnityAoa = savedInd.calculatedIndemnityAoa
          indemnitiesCalculated.push(savedInd)

          const owner = state.customers.find((c) => c.id === policy.customerId)
          await admin.from('notifications').insert({
            user_id: owner?.userId ?? null,
            target_role: 'farmer',
            title: `Gatilho activado — Apólice ${policy.policyNumber}`,
            message: `Precipitação observada de ${createdEvent.observedPrecipitationMm?.toFixed(1)} mm activou indemnização de ${savedInd.calculatedIndemnityAoa.toLocaleString('pt-AO')} AOA.`,
            category: 'climate',
            is_read: false,
            related_entity_type: 'climate_event',
            related_entity_id: createdEvent.id,
          })
        }
      }

      if (evaluation.exception) {
        const { data: excRow, error: excErr } = await admin
          .from('operational_exceptions')
          .insert({
            event_id: createdEvent.id,
            policy_id: policy.id,
            reason_code: evaluation.exception.reasonCode,
            severity: evaluation.exception.severity,
            description: evaluation.exception.description,
            status: evaluation.exception.status,
            previous_event_status: evaluation.exception.previousEventStatus,
          })
          .select('*')
          .single()

        if (!excErr && excRow) {
          const savedExc: OperationalException = {
            ...evaluation.exception,
            id: String(excRow.id),
            eventId: createdEvent.id,
            createdAt: String(excRow.created_at),
          }
          exceptionsCreated.push(savedExc)

          await admin.from('notifications').insert({
            user_id: null,
            target_role: 'operator',
            title: `Nova excepção operacional — ${policy.policyNumber}`,
            message: savedExc.description,
            category: 'exception',
            is_read: false,
            related_entity_type: 'exception',
            related_entity_id: savedExc.id,
          })
        }
      }

      existingEvents.unshift(createdEvent)
      eventsCreated.push(createdEvent)

      await recordAuditLog({
        userId: input.actorUserId,
        userEmail: input.actorEmail,
        userRole: input.actorRole,
        action: 'CLIMATE_EVENT_EVALUATED',
        entityType: 'climate_event',
        entityId: createdEvent.id,
        newState: {
          status: createdEvent.status,
          observedMm: createdEvent.observedPrecipitationMm,
          indemnityAoa: createdEvent.calculatedIndemnityAoa,
        },
        metadata: { policyNumber: policy.policyNumber, scenario: input.scenario },
        result: evaluation.exception ? 'blocked' : 'success',
      })
    }

    return {
      policiesEvaluated: activePolicies.length,
      eventsCreated,
      duplicatesPrevented,
      indemnitiesCalculated,
      exceptionsCreated,
      usedLiveExternalApi,
      summary: `Monitorizadas ${activePolicies.length} apólices: ${eventsCreated.length} eventos registados, ${indemnitiesCalculated.length} indemnizações calculadas, ${exceptionsCreated.length} excepções abertas, ${duplicatesPrevented} duplicados prevenidos.`,
    }
  }

  // Fallback Demonstração (quando Supabase não está configurado)
  const db = getDemoDatabase()
  const activePolicies = db.policies.filter((p) =>
    input.policyId ? p.id === input.policyId : p.status === 'active'
  )

  const eventsCreated: ClimateEvent[] = []
  const indemnitiesCalculated: IndemnityCalculation[] = []
  const exceptionsCreated: OperationalException[] = []
  let duplicatesPrevented = 0
  let usedLiveExternalApi = false

  for (const policy of activePolicies) {
    const windowDays = policy.contractTerms.observationWindowDays
    const endAnchor = new Date(Date.now() - 7 * 86_400_000)
    const startAnchor = new Date(endAnchor.getTime() - (windowDays - 1) * 86_400_000)
    const windowEnd = endAnchor.toISOString().slice(0, 10)
    const windowStart = startAnchor.toISOString().slice(0, 10)

    let primaryObs: ClimateObservation[] = []
    let secondaryObs: ClimateObservation[] = []
    let isSimulatedScenario = true

    if (input.scenario === 'live_or_stored') {
      const [omRes, npRes] = await Promise.all([
        openMeteoAdapter.fetchDailyPrecipitation({
          latitude: policy.latitude,
          longitude: policy.longitude,
          startDate: windowStart,
          endDate: windowEnd,
        }),
        nasaPowerAdapter.fetchDailyPrecipitation({
          latitude: policy.latitude,
          longitude: policy.longitude,
          startDate: windowStart,
          endDate: windowEnd,
        }),
      ])

      if (!omRes.error && omRes.observations.length > 0) {
        primaryObs = omRes.observations
        usedLiveExternalApi = true
        isSimulatedScenario = false
        for (const obs of primaryObs) {
          const exists = db.climateObservations.some(
            (x) =>
              x.providerCode === obs.providerCode &&
              x.observationDate === obs.observationDate &&
              Math.abs(x.latitude - obs.latitude) < 0.05 &&
              Math.abs(x.longitude - obs.longitude) < 0.05
          )
          if (!exists) db.climateObservations.push(obs)
        }
      }

      if (!npRes.error && npRes.observations.length > 0) {
        secondaryObs = npRes.observations
        usedLiveExternalApi = true
        for (const obs of secondaryObs) {
          const exists = db.climateObservations.some(
            (x) =>
              x.providerCode === obs.providerCode &&
              x.observationDate === obs.observationDate &&
              Math.abs(x.latitude - obs.latitude) < 0.05 &&
              Math.abs(x.longitude - obs.longitude) < 0.05
          )
          if (!exists) db.climateObservations.push(obs)
        }
      }

      if (primaryObs.length === 0) {
        const storedPrimary = db.climateObservations.filter(
          (o) =>
            o.providerCode === 'open_meteo_era5' &&
            Math.abs(o.latitude - policy.latitude) < 0.1 &&
            Math.abs(o.longitude - policy.longitude) < 0.1
        )
        if (storedPrimary.length > 0) {
          primaryObs = storedPrimary.slice(0, windowDays)
        } else {
          const fallback = generateScenarioSeries({
            policy,
            scenario: 'normal_no_trigger',
            windowStart,
            days: windowDays,
          })
          primaryObs = fallback.primary
          secondaryObs = fallback.secondary
        }
      }
    } else {
      const scenarioStart =
        input.scenario === 'drought_trigger'
          ? '2026-10-01'
          : input.scenario === 'excess_rain_trigger'
            ? '2026-10-12'
            : input.scenario === 'insufficient_data'
              ? '2026-10-05'
              : input.scenario === 'source_disagreement'
                ? '2026-10-08'
                : '2026-10-02'
      const sEnd = new Date(`${scenarioStart}T00:00:00Z`)
      sEnd.setUTCDate(sEnd.getUTCDate() + windowDays - 1)
      const scEndIso = sEnd.toISOString().slice(0, 10)

      const generated = generateScenarioSeries({
        policy,
        scenario: input.scenario,
        windowStart: scenarioStart,
        days: windowDays,
      })
      primaryObs = generated.primary
      secondaryObs = generated.secondary

      const validation = validateClimateSeries({
        observations: primaryObs,
        windowStart: scenarioStart,
        windowEnd: scEndIso,
        minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
        targetLatitude: policy.latitude,
        targetLongitude: policy.longitude,
      })

      const secValidation = validateClimateSeries({
        observations: secondaryObs,
        windowStart: scenarioStart,
        windowEnd: scEndIso,
        minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
        targetLatitude: policy.latitude,
        targetLongitude: policy.longitude,
      })

      const comparison = compareClimateSources({
        farmId: policy.farmId,
        policyId: policy.id,
        windowStart: scenarioStart,
        windowEnd: scEndIso,
        primaryProvider: 'Open-Meteo ERA5 / ERA5-Land',
        secondaryProvider: 'NASA POWER Daily Agroclimatology',
        primaryAccumulatedMm: validation.accumulatedPrecipitationMm,
        secondaryAccumulatedMm: secValidation.accumulatedPrecipitationMm,
        thresholdPercent: policy.contractTerms.maxSourceDisagreementPercent,
      })
      db.climateComparisons.unshift(comparison)

      const evaluation = evaluateParametricTrigger({
        policy,
        windowStart: scenarioStart,
        windowEnd: scEndIso,
        validation,
        comparison,
        existingEvents: db.climateEvents,
        isSimulatedScenario: true,
      })

      if (evaluation.duplicatePrevented) {
        duplicatesPrevented += 1
        await recordAuditLog({
          userId: input.actorUserId,
          userEmail: input.actorEmail,
          userRole: input.actorRole,
          action: 'DUPLICATE_EVENT_PREVENTED',
          entityType: 'climate_event',
          entityId: evaluation.event.id,
          metadata: { policyNumber: policy.policyNumber, eventKey: evaluation.event.eventKey },
          result: 'blocked',
        })
        continue
      }

      const event = evaluation.event
      if (evaluation.triggerActivated && event.observedPrecipitationMm !== null) {
        const indemnity = calculateIndemnity({
          event,
          policy,
          observedPrecipitationMm: event.observedPrecipitationMm,
        })
        event.indemnityCalculationId = indemnity.id
        event.calculatedIndemnityAoa = indemnity.calculatedIndemnityAoa
        event.status =
          indemnity.calculatedIndemnityAoa > 0
            ? 'indemnity_calculated'
            : 'trigger_not_activated'

        db.indemnities.unshift(indemnity)
        indemnitiesCalculated.push(indemnity)

        const owner = db.customers.find((c) => c.id === policy.customerId)
        db.notifications.unshift({
          id: generateId('notif'),
          userId: owner?.userId ?? null,
          targetRole: 'farmer',
          title: `Gatilho activado — Apólice ${policy.policyNumber}`,
          message: `Precipitação observada de ${event.observedPrecipitationMm.toFixed(1)} mm activou indemnização de ${indemnity.calculatedIndemnityAoa.toLocaleString('pt-AO')} AOA.`,
          category: 'climate',
          read: false,
          relatedEntityType: 'climate_event',
          relatedEntityId: event.id,
          createdAt: new Date().toISOString(),
        })
      }

      if (evaluation.exception) {
        db.exceptions.unshift(evaluation.exception)
        exceptionsCreated.push(evaluation.exception)
        db.notifications.unshift({
          id: generateId('notif'),
          userId: null,
          targetRole: 'operator',
          title: `Nova excepção operacional — ${policy.policyNumber}`,
          message: evaluation.exception.description,
          category: 'exception',
          read: false,
          relatedEntityType: 'exception',
          relatedEntityId: evaluation.exception.id,
          createdAt: new Date().toISOString(),
        })
      }

      db.climateEvents.unshift(event)
      eventsCreated.push(event)

      await recordAuditLog({
        userId: input.actorUserId,
        userEmail: input.actorEmail,
        userRole: input.actorRole,
        action: 'CLIMATE_EVENT_EVALUATED',
        entityType: 'climate_event',
        entityId: event.id,
        newState: {
          status: event.status,
          observedMm: event.observedPrecipitationMm,
          indemnityAoa: event.calculatedIndemnityAoa,
        },
        metadata: { policyNumber: policy.policyNumber, scenario: input.scenario },
        result: evaluation.exception ? 'blocked' : 'success',
      })
      continue
    }

    const effectiveStart = primaryObs[0]?.observationDate || windowStart
    const effectiveEnd =
      primaryObs[primaryObs.length - 1]?.observationDate || windowEnd

    const validation = validateClimateSeries({
      observations: primaryObs,
      windowStart: effectiveStart,
      windowEnd: effectiveEnd,
      minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
      targetLatitude: policy.latitude,
      targetLongitude: policy.longitude,
    })

    let comparison = null
    if (secondaryObs.length > 0) {
      const secVal = validateClimateSeries({
        observations: secondaryObs,
        windowStart: effectiveStart,
        windowEnd: effectiveEnd,
        minCompletenessPercent: policy.contractTerms.minDataCompletenessPercent,
        targetLatitude: policy.latitude,
        targetLongitude: policy.longitude,
      })
      comparison = compareClimateSources({
        farmId: policy.farmId,
        policyId: policy.id,
        windowStart: effectiveStart,
        windowEnd: effectiveEnd,
        primaryProvider: 'Open-Meteo ERA5 / ERA5-Land',
        secondaryProvider: 'NASA POWER Daily Agroclimatology',
        primaryAccumulatedMm: validation.accumulatedPrecipitationMm,
        secondaryAccumulatedMm: secVal.accumulatedPrecipitationMm,
        thresholdPercent: policy.contractTerms.maxSourceDisagreementPercent,
      })
      db.climateComparisons.unshift(comparison)
    }

    const evaluation = evaluateParametricTrigger({
      policy,
      windowStart: effectiveStart,
      windowEnd: effectiveEnd,
      validation,
      comparison,
      existingEvents: db.climateEvents,
      isSimulatedScenario,
    })

    if (evaluation.duplicatePrevented) {
      duplicatesPrevented += 1
      continue
    }

    const event = evaluation.event
    if (evaluation.triggerActivated && event.observedPrecipitationMm !== null) {
      const indemnity = calculateIndemnity({
        event,
        policy,
        observedPrecipitationMm: event.observedPrecipitationMm,
      })
      event.indemnityCalculationId = indemnity.id
      event.calculatedIndemnityAoa = indemnity.calculatedIndemnityAoa
      event.status =
        indemnity.calculatedIndemnityAoa > 0
          ? 'indemnity_calculated'
          : 'trigger_not_activated'
      db.indemnities.unshift(indemnity)
      indemnitiesCalculated.push(indemnity)
    }

    if (evaluation.exception) {
      db.exceptions.unshift(evaluation.exception)
      exceptionsCreated.push(evaluation.exception)
    }

    db.climateEvents.unshift(event)
    eventsCreated.push(event)
  }

  saveDemoDatabase(db)

  return {
    policiesEvaluated: activePolicies.length,
    eventsCreated,
    duplicatesPrevented,
    indemnitiesCalculated,
    exceptionsCreated,
    usedLiveExternalApi,
    summary: `Monitorizadas ${activePolicies.length} apólices: ${eventsCreated.length} eventos registados, ${indemnitiesCalculated.length} indemnizações calculadas, ${exceptionsCreated.length} excepções abertas, ${duplicatesPrevented} duplicados prevenidos.`,
  }
}
