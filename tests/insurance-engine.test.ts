import { beforeEach, describe, expect, it } from 'vitest'
import { resetDemoDatabase } from '@/lib/store/database'
import { calculateParametricPremium } from '@/services/premium/premium-engine'
import { validateClimateSeries } from '@/services/climate/validation'
import { compareClimateSources } from '@/services/climate/comparison'
import { evaluateParametricTrigger } from '@/services/triggers/trigger-engine'
import { calculateIndemnity } from '@/services/indemnities/indemnity-engine'
import { simulatePayment } from '@/services/payments/payment-service'
import type {
  AgriculturalCampaign,
  ClimateObservation,
  CropType,
  InsurancePolicy,
  InsuranceProduct,
} from '@/types/domain'

const SAMPLE_CROP: CropType = {
  id: 'crop-milho',
  code: 'MILHO',
  name: 'Milho Branco',
  scientificName: 'Zea mays',
  riskMultiplier: 1.0,
  optimalRainfallMinMm: 500,
  optimalRainfallMaxMm: 950,
  cycleDays: 120,
}

const SAMPLE_CAMPAIGN: AgriculturalCampaign = {
  id: 'camp-2026-chuvas',
  code: 'CAMP-2026-CHUVAS',
  name: 'Época das Chuvas 2026/2027',
  startDate: '2026-10-01',
  endDate: '2027-03-31',
  status: 'active',
  riskMultiplier: 1.0,
}

const SAMPLE_DROUGHT_PRODUCT: InsuranceProduct = {
  id: 'prod-seca-milho',
  code: 'SECA-PLANO-30D',
  name: 'Protecção Seca Planalto (30 dias)',
  description: 'Cobertura paramétrica contra défice de precipitação acumulada.',
  coverageType: 'drought',
  activeVersionId: 'ver-seca-1',
  activeVersionNumber: 1,
  status: 'active',
  supportedCropIds: ['crop-milho'],
  supportedProvinces: ['Huambo', 'Cunene'],
  minCapitalAoa: 200000,
  maxCapitalAoa: 25000000,
  basePremiumRate: 0.06,
  minPremiumAoa: 25000,
  triggerThresholdMm: 80,
  observationWindowDays: 30,
  maxSourceDisagreementPercent: 25,
  minDataCompletenessPercent: 85,
  severityBands: [
    { id: 'b0', label: 'Abaixo do limiar mínimo (< 10%)', minDeviationPercent: 0, maxDeviationPercent: 10, payoutPercentage: 0 },
    { id: 'b1', label: 'Seca Moderada (10% a 25%)', minDeviationPercent: 10, maxDeviationPercent: 25, payoutPercentage: 25 },
    { id: 'b2', label: 'Seca Significativa (25% a 45%)', minDeviationPercent: 25, maxDeviationPercent: 45, payoutPercentage: 50 },
    { id: 'b3', label: 'Seca Severa (45% a 65%)', minDeviationPercent: 45, maxDeviationPercent: 65, payoutPercentage: 75 },
    { id: 'b4', label: 'Seca Extrema (>= 65%)', minDeviationPercent: 65, maxDeviationPercent: null, payoutPercentage: 100 },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

function buildValidPolicy(coverageType: 'drought' | 'excess_rain' = 'drought'): InsurancePolicy {
  return {
    id: 'pol-test-01',
    policyNumber: 'NS-AGRO-2026-9001',
    simulationId: 'sim-test-01',
    customerId: 'cust-01',
    customerName: 'Produtor Teste',
    farmId: 'farm-01',
    farmName: 'Fazenda Teste Huambo',
    province: 'Huambo',
    municipality: 'Caála',
    latitude: -12.85,
    longitude: 15.56,
    cropId: 'crop-milho',
    cropName: 'Milho Branco',
    campaignId: 'camp-2026-chuvas',
    campaignName: 'Época das Chuvas 2026/2027',
    productId: SAMPLE_DROUGHT_PRODUCT.id,
    productName: SAMPLE_DROUGHT_PRODUCT.name,
    insuredCapitalAoa: 2000000,
    premiumAoa: 120000,
    startDate: '2026-10-01',
    endDate: '2027-03-31',
    status: 'active',
    contractTerms: {
      productVersionId: 'ver-seca-1',
      productVersionNumber: 1,
      coverageType,
      climateIndicator: 'Precipitação acumulada em 30 dias (mm)',
      triggerThresholdMm: coverageType === 'drought' ? 80 : 320,
      observationWindowDays: 30,
      minDataCompletenessPercent: 85,
      maxSourceDisagreementPercent: 25,
      severityBands: SAMPLE_DROUGHT_PRODUCT.severityBands,
      termsAcceptedAt: '2026-10-01T10:00:00.000Z',
      termsVersion: 'v1.0-AO',
      isSimulatedDemonstration: true,
    },
    issuedAt: '2026-10-01T10:05:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
  }
}

function makeObservations(
  dailyValues: Array<number | null>,
  startDate = '2026-10-01'
): ClimateObservation[] {
  const base = new Date(`${startDate}T00:00:00Z`)
  return dailyValues.map((val, idx) => {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + idx)
    return {
      id: `obs-${idx}`,
      providerCode: 'open_meteo_era5',
      providerName: 'Open-Meteo ERA5',
      latitude: -12.85,
      longitude: 15.56,
      observationDate: d.toISOString().slice(0, 10),
      precipitationMm: val,
      unit: 'mm',
      retrievedAt: '2026-10-31T00:00:00.000Z',
      sourceUrl: 'https://archive-api.open-meteo.com/v1/archive',
      spatialResolution: '~9 km',
      qualityStatus: val === null ? 'insufficient' : 'valid',
      isSimulatedData: false,
      rawPayloadReference: `ref-${idx}`,
      validationNotes: [],
    }
  })
}

describe('Motor de Cálculo de Prémios Paramétricos', () => {
  it('calcula prémio exacto com multiplicadores provinciais e limite mínimo', () => {
    // Huambo tem climateRiskMultiplier = 1.05 em config/angola.ts
    const result = calculateParametricPremium({
      insuredCapitalAoa: 2000000,
      province: 'Huambo',
      crop: SAMPLE_CROP,
      campaign: SAMPLE_CAMPAIGN,
      product: SAMPLE_DROUGHT_PRODUCT,
    })

    // 2.000.000 * (0.06 * 1.05 * 1.0 * 1.0 * 1.0) = 126.000 AOA
    expect(result.finalPremiumAoa).toBe(126000)
    expect(result.minimumPremiumApplied).toBe(false)
    expect(result.maximumIndemnityAoa).toBe(2000000)

    // Província mais seca (Cunene: 1.38) deve gerar prémio superior ao do Huambo
    const cuneneResult = calculateParametricPremium({
      insuredCapitalAoa: 2000000,
      province: 'Cunene',
      crop: SAMPLE_CROP,
      campaign: SAMPLE_CAMPAIGN,
      product: SAMPLE_DROUGHT_PRODUCT,
    })
    expect(cuneneResult.finalPremiumAoa).toBeGreaterThan(result.finalPremiumAoa)

    // Capital baixo aplica o prémio mínimo contratual (25.000 AOA)
    const minResult = calculateParametricPremium({
      insuredCapitalAoa: 200000,
      province: 'Huambo',
      crop: SAMPLE_CROP,
      campaign: SAMPLE_CAMPAIGN,
      product: SAMPLE_DROUGHT_PRODUCT,
    })
    expect(minResult.minimumPremiumApplied).toBe(true)
    expect(minResult.finalPremiumAoa).toBe(25000)
  })
})

describe('Validação de Qualidade de Dados Climáticos', () => {
  it('nunca converte valores em falta (null) para 0 mm e bloqueia séries incompletas', () => {
    // 10 dias esperados, 4 em falta -> 60% válida (< 85% exigidos)
    const obs = makeObservations([10, null, 5, null, null, 8, 2, null, 4, 6])
    const summary = validateClimateSeries({
      observations: obs,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      minCompletenessPercent: 85,
      targetLatitude: -12.85,
      targetLongitude: 15.56,
    })

    expect(summary.passed).toBe(false)
    expect(summary.qualityStatus).toBe('insufficient')
    expect(summary.missingDays).toBe(4)
    expect(summary.completenessPercent).toBe(60)
    expect(summary.accumulatedPrecipitationMm).toBeNull()
  })

  it('rejeita observações duplicadas na mesma data e valores fisicamente inválidos', () => {
    const obs = makeObservations([12, 14, 8, 9, 10])
    obs.push({ ...obs[0], id: 'obs-dup' })
    obs[2].precipitationMm = -5

    const summary = validateClimateSeries({
      observations: obs,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-05',
      minCompletenessPercent: 85,
      targetLatitude: -12.85,
      targetLongitude: 15.56,
    })

    expect(summary.passed).toBe(false)
    expect(summary.duplicateDays).toBe(1)
    expect(summary.invalidDays).toBe(1)
    expect(summary.qualityStatus).toBe('invalid_values')
    expect(summary.accumulatedPrecipitationMm).toBeNull()
  })
})

describe('Comparação Multi-Fonte Climática', () => {
  it('aprova fontes concordantes e sinaliza discordância acima do limiar', () => {
    const concordant = compareClimateSources({
      farmId: 'farm-01',
      policyId: 'pol-test-01',
      windowStart: '2026-10-01',
      windowEnd: '2026-10-30',
      primaryProvider: 'Open-Meteo ERA5',
      secondaryProvider: 'NASA POWER',
      primaryAccumulatedMm: 45,
      secondaryAccumulatedMm: 48,
      thresholdPercent: 25,
    })
    expect(concordant.passed).toBe(true)

    const divergent = compareClimateSources({
      farmId: 'farm-01',
      policyId: 'pol-test-01',
      windowStart: '2026-10-01',
      windowEnd: '2026-10-30',
      primaryProvider: 'Open-Meteo ERA5',
      secondaryProvider: 'NASA POWER',
      primaryAccumulatedMm: 40,
      secondaryAccumulatedMm: 100,
      thresholdPercent: 25,
    })
    expect(divergent.passed).toBe(false)
    expect(divergent.disagreementPercent).toBe(60)
  })
})

describe('Motor de Gatilhos Paramétricos e Prevenção de Duplicação', () => {
  it('activa gatilho de seca quando acumulado é inferior ao limiar e evita duplicação', () => {
    const policy = buildValidPolicy('drought')
    // 10 dias válidos somando 40 mm (abaixo do limiar de 80 mm)
    const obs = makeObservations([4, 4, 4, 4, 4, 4, 4, 4, 4, 4])
    const validation = validateClimateSeries({
      observations: obs,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      minCompletenessPercent: 85,
      targetLatitude: -12.85,
      targetLongitude: 15.56,
    })

    const first = evaluateParametricTrigger({
      policy,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      validation,
      comparison: null,
      existingEvents: [],
      isSimulatedScenario: false,
    })

    expect(first.triggerActivated).toBe(true)
    expect(first.duplicatePrevented).toBe(false)
    expect(first.event.status).toBe('trigger_activated')

    // Segunda execução na mesma janela e apólice deve ser travada
    const second = evaluateParametricTrigger({
      policy,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      validation,
      comparison: null,
      existingEvents: [first.event],
      isSimulatedScenario: false,
    })

    expect(second.duplicatePrevented).toBe(true)
    expect(second.triggerActivated).toBe(false)
  })

  it('bloqueia activação automática e cria excepção operacional quando há discordância ou dados insuficientes', () => {
    const policy = buildValidPolicy('drought')
    const obs = makeObservations([1, null, null, null, 2, 1, null, null, 1, 2])
    const insufficientValidation = validateClimateSeries({
      observations: obs,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      minCompletenessPercent: 85,
      targetLatitude: -12.85,
      targetLongitude: 15.56,
    })

    const res = evaluateParametricTrigger({
      policy,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-10',
      validation: insufficientValidation,
      comparison: null,
      existingEvents: [],
      isSimulatedScenario: true,
    })

    expect(res.triggerActivated).toBe(false)
    expect(res.event.status).toBe('exception')
    expect(res.exception).not.toBeNull()
    expect(res.exception?.reasonCode).toBe('insufficient_data')
  })
})

describe('Motor de Cálculo de Indemnizações por Faixas de Severidade', () => {
  it('calcula indemnização correcta conforme desvio e respeita o tecto do capital segurado', () => {
    const policy = buildValidPolicy('drought')
    const baseEvent = {
      id: 'evt-1',
      eventKey: 'k',
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      customerName: policy.customerName,
      farmId: policy.farmId,
      farmName: policy.farmName,
      province: policy.province,
      coverageType: 'drought' as const,
      windowStart: '2026-10-01',
      windowEnd: '2026-10-30',
      observedPrecipitationMm: 48,
      contractualThresholdMm: 80,
      dataQualityStatus: 'valid' as const,
      comparisonId: null,
      status: 'trigger_activated' as const,
      ruleAppliedExplanation: 'Teste',
      indemnityCalculationId: null,
      calculatedIndemnityAoa: null,
      evidenceSummary: 'Teste',
      isSimulatedScenario: false,
      detectedAt: '2026-10-31T00:00:00.000Z',
      updatedAt: '2026-10-31T00:00:00.000Z',
    }

    // 48 mm face a 80 mm => desvio = (80 - 48) / 80 = 40% => Faixa 25%–45% => 50% do capital (1.000.000 AOA)
    const calc50 = calculateIndemnity({
      event: baseEvent,
      policy,
      observedPrecipitationMm: 48,
    })
    expect(calc50.deviationPercent).toBe(40)
    expect(calc50.payoutPercentage).toBe(50)
    expect(calc50.calculatedIndemnityAoa).toBe(1000000)

    // 10 mm face a 80 mm => desvio = 87.5% => Faixa >= 65% => 100% do capital (2.000.000 AOA)
    const calc100 = calculateIndemnity({
      event: baseEvent,
      policy,
      observedPrecipitationMm: 10,
    })
    expect(calc100.payoutPercentage).toBe(100)
    expect(calc100.calculatedIndemnityAoa).toBe(2000000)
    expect(calc100.calculatedIndemnityAoa).toBeLessThanOrEqual(policy.insuredCapitalAoa)
  })
})

describe('Idempotência na Simulação de Pagamentos', () => {
  beforeEach(() => {
    resetDemoDatabase()
  })

  it('evita pagamentos duplicados quando a mesma chave de idempotência é reutilizada', async () => {
    const first = await simulatePayment({
      kind: 'premium',
      policyId: 'pol-01',
      channel: 'multicaixa_express_sim',
      simulateOutcome: 'successful',
      idempotencyKey: 'idem-test-key-001',
      actorUserId: 'usr-farmer-01',
      actorEmail: 'agricultor@nossa.demo.ao',
      actorRole: 'farmer',
    })

    expect(first.idempotentReplay).toBe(false)
    expect(first.payment.status).toBe('successful')

    const second = await simulatePayment({
      kind: 'premium',
      policyId: 'pol-01',
      channel: 'multicaixa_express_sim',
      simulateOutcome: 'successful',
      idempotencyKey: 'idem-test-key-001',
      actorUserId: 'usr-farmer-01',
      actorEmail: 'agricultor@nossa.demo.ao',
      actorRole: 'farmer',
    })

    expect(second.idempotentReplay).toBe(true)
    expect(second.payment.id).toBe(first.payment.id)
  })
})
