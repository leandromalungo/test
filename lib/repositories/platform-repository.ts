import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  allocateDemoPolicyNumber,
  generateId,
  getDemoDatabase,
  saveDemoDatabase,
} from '@/lib/store/database'
import {
  isSupabaseConfigured,
  requireSupabaseAdminClient,
} from '@/lib/supabase/server'
import type {
  AgriculturalCampaign,
  ClimateEvent,
  ClimateObservation,
  ClimateProviderConfig,
  ClimateSourceComparison,
  CropType,
  CustomerRecord,
  EventStatus,
  FarmProperty,
  IndemnityCalculation,
  InsurancePolicy,
  InsuranceProduct,
  InsuranceSimulation,
  OperationalException,
  PaymentRecord,
  PlatformNotification,
  SeverityBand,
  SystemSettings,
  UserRole,
} from '@/types/domain'

/**
 * Camada de Repositório Unificada da Plataforma NOSSA AgroParamétrico.
 *
 * Comportamento por ambiente:
 * - Quando as variáveis do Supabase estão configuradas (`isSupabaseConfigured() === true`),
 *   TODAS as leituras e escritas ocorrem directamente no PostgreSQL do Supabase via
 *   cliente servidor (`SUPABASE_SERVICE_ROLE_KEY`), sem nunca recorrer a ficheiros em `/tmp`.
 * - Quando as credenciais ainda não foram preenchidas (pré-visualização local ou testes Vitest),
 *   opera com o repositório local de demonstração para manter a aplicação executável.
 */

export interface PlatformViewState {
  storageMode: 'supabase' | 'demonstration'
  customers: CustomerRecord[]
  crops: CropType[]
  campaigns: AgriculturalCampaign[]
  farms: FarmProperty[]
  products: InsuranceProduct[]
  simulations: InsuranceSimulation[]
  policies: InsurancePolicy[]
  climateProviders: ClimateProviderConfig[]
  climateObservations: ClimateObservation[]
  climateComparisons: ClimateSourceComparison[]
  climateEvents: ClimateEvent[]
  indemnities: IndemnityCalculation[]
  exceptions: OperationalException[]
  payments: PaymentRecord[]
  notifications: PlatformNotification[]
  settings: SystemSettings
}

export class RepositoryConflictError extends Error {
  statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'RepositoryConflictError'
  }
}

export class RepositoryNotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'RepositoryNotFoundError'
  }
}

// ============================================================================
// MAPEAMENTO DE LINHAS POSTGRESQL -> TIPOS DE DOMÍNIO
// ============================================================================

const PROVIDER_NAME_FALLBACK: Record<string, string> = {
  open_meteo_era5: 'Open-Meteo ERA5 / ERA5-Land',
  nasa_power: 'NASA POWER Daily Agroclimatology',
  chirps: 'CHIRPS v2.0 (UCSB Climate Hazards)',
  inamet: 'INAMET',
  ggpen: 'GGPEN',
  copernicus: 'Copernicus Climate Data Store',
}

function mapCropRow(row: Record<string, unknown>): CropType {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    scientificName: String(row.scientific_name),
    riskMultiplier: Number(row.risk_multiplier),
    optimalRainfallMinMm: Number(row.optimal_rainfall_min_mm),
    optimalRainfallMaxMm: Number(row.optimal_rainfall_max_mm),
    cycleDays: Number(row.cycle_days),
  }
}

function mapCampaignRow(row: Record<string, unknown>): AgriculturalCampaign {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: row.status as AgriculturalCampaign['status'],
    riskMultiplier: Number(row.risk_multiplier),
  }
}

function mapCustomerRow(row: Record<string, unknown>): CustomerRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    nif: String(row.nif),
    province: String(row.province),
    municipality: String(row.municipality),
    farmerCategory: row.farmer_category as CustomerRecord['farmerCategory'],
    kycStatus: row.kyc_status as CustomerRecord['kycStatus'],
    createdAt: String(row.created_at),
  }
}

function mapFarmRow(
  row: Record<string, unknown>,
  cropNameById: Map<string, string>
): FarmProperty {
  const locRaw = Array.isArray(row.farm_locations)
    ? (row.farm_locations[0] as Record<string, unknown> | undefined)
    : (row.farm_locations as Record<string, unknown> | null | undefined)
  const cropId = String(row.primary_crop_id)

  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    name: String(row.name),
    province: locRaw ? String(locRaw.province) : 'Huambo',
    municipality: locRaw ? String(locRaw.municipality) : '',
    commune: locRaw ? String(locRaw.commune) : '',
    latitude: locRaw ? Number(locRaw.latitude) : -12.85,
    longitude: locRaw ? Number(locRaw.longitude) : 15.56,
    areaHectares: Number(row.area_hectares),
    primaryCropId: cropId,
    primaryCropName: cropNameById.get(cropId) || 'Cultura Agrícola',
    soilType: String(row.soil_type || 'Franco-argiloso'),
    irrigationType: row.irrigation_type as FarmProperty['irrigationType'],
    createdAt: String(row.created_at),
  }
}

function mapProductRow(
  productRow: Record<string, unknown>,
  versions: Array<Record<string, unknown>>
): InsuranceProduct | null {
  const activeNum = Number(productRow.active_version_number)
  const ver =
    versions.find((v) => Number(v.version_number) === activeNum) ||
    versions.sort((a, b) => Number(b.version_number) - Number(a.version_number))[0]

  if (!ver) return null

  return {
    id: String(productRow.id),
    code: String(productRow.code),
    name: String(productRow.name),
    description: String(productRow.description),
    coverageType: productRow.coverage_type as InsuranceProduct['coverageType'],
    activeVersionId: String(ver.id),
    activeVersionNumber: Number(ver.version_number),
    status: productRow.status as InsuranceProduct['status'],
    supportedCropIds: Array.isArray(ver.supported_crop_ids)
      ? ver.supported_crop_ids.map(String)
      : [],
    supportedProvinces: Array.isArray(ver.supported_provinces)
      ? ver.supported_provinces.map(String)
      : [],
    minCapitalAoa: Number(ver.min_capital_aoa),
    maxCapitalAoa: Number(ver.max_capital_aoa),
    basePremiumRate: Number(ver.base_premium_rate),
    minPremiumAoa: Number(ver.min_premium_aoa),
    triggerThresholdMm: Number(ver.trigger_threshold_mm),
    observationWindowDays: Number(ver.observation_window_days),
    maxSourceDisagreementPercent: Number(ver.max_source_disagreement_percent),
    minDataCompletenessPercent: Number(ver.min_data_completeness_percent),
    severityBands: (ver.severity_bands as SeverityBand[]) || [],
    createdAt: String(productRow.created_at),
    updatedAt: String(productRow.updated_at),
  }
}

function mapProviderRow(row: Record<string, unknown>): ClimateProviderConfig {
  return {
    id: String(row.id),
    code: row.code as ClimateProviderConfig['code'],
    name: String(row.name),
    role: row.role as ClimateProviderConfig['role'],
    status: row.status as ClimateProviderConfig['status'],
    endpointUrl: String(row.endpoint_url),
    spatialResolution: String(row.spatial_resolution),
    temporalResolution: String(row.temporal_resolution),
    isLiveExternal: Boolean(row.is_live_external),
    description: String(row.description),
  }
}

function mapObservationRow(
  row: Record<string, unknown>,
  providerNameByCode: Map<string, string>
): ClimateObservation {
  const code = String(row.provider_code) as ClimateObservation['providerCode']
  return {
    id: String(row.id),
    providerCode: code,
    providerName:
      providerNameByCode.get(code) || PROVIDER_NAME_FALLBACK[code] || code,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    observationDate: String(row.observation_date),
    precipitationMm:
      row.precipitation_mm === null || row.precipitation_mm === undefined
        ? null
        : Number(row.precipitation_mm),
    unit: 'mm',
    retrievedAt: String(row.retrieved_at),
    sourceUrl: String(row.source_url),
    spatialResolution: String(row.spatial_resolution),
    qualityStatus: row.quality_status as ClimateObservation['qualityStatus'],
    isSimulatedData: Boolean(row.is_simulated_data),
    rawPayloadReference: String(row.raw_payload_reference),
    validationNotes: Array.isArray(row.validation_notes)
      ? row.validation_notes.map(String)
      : [],
  }
}

function mapComparisonRow(row: Record<string, unknown>): ClimateSourceComparison {
  return {
    id: String(row.id),
    farmId: String(row.farm_id),
    policyId: row.policy_id ? String(row.policy_id) : null,
    windowStart: String(row.window_start),
    windowEnd: String(row.window_end),
    primaryProvider: String(row.primary_provider),
    secondaryProvider: String(row.secondary_provider),
    primaryAccumulatedMm:
      row.primary_accumulated_mm === null || row.primary_accumulated_mm === undefined
        ? null
        : Number(row.primary_accumulated_mm),
    secondaryAccumulatedMm:
      row.secondary_accumulated_mm === null || row.secondary_accumulated_mm === undefined
        ? null
        : Number(row.secondary_accumulated_mm),
    disagreementPercent:
      row.disagreement_percent === null || row.disagreement_percent === undefined
        ? null
        : Number(row.disagreement_percent),
    disagreementAbsoluteMm:
      row.disagreement_absolute_mm === null || row.disagreement_absolute_mm === undefined
        ? null
        : Number(row.disagreement_absolute_mm),
    thresholdPercent: Number(row.threshold_percent),
    passed: Boolean(row.passed),
    notes: String(row.notes),
    createdAt: String(row.created_at),
  }
}

function mapPolicyRow(
  row: Record<string, unknown>,
  termsRow: Record<string, unknown> | undefined,
  productVersionNumber: number,
  customerById: Map<string, CustomerRecord>,
  farmById: Map<string, FarmProperty>,
  cropById: Map<string, CropType>,
  campaignById: Map<string, AgriculturalCampaign>,
  productNameById: Map<string, string>
): InsurancePolicy {
  const customer = customerById.get(String(row.customer_id))
  const farm = farmById.get(String(row.farm_id))
  const crop = cropById.get(String(row.crop_id))
  const campaign = campaignById.get(String(row.campaign_id))
  const productName = productNameById.get(String(row.product_id)) || 'Produto Paramétrico'

  return {
    id: String(row.id),
    policyNumber: String(row.policy_number),
    simulationId: String(row.simulation_id),
    customerId: String(row.customer_id),
    customerName: customer?.fullName || 'Produtor Segurado',
    farmId: String(row.farm_id),
    farmName: farm?.name || 'Propriedade Agrícola',
    province: farm?.province || customer?.province || 'Huambo',
    municipality: farm?.municipality || customer?.municipality || '',
    latitude: farm?.latitude ?? -12.85,
    longitude: farm?.longitude ?? 15.56,
    cropId: String(row.crop_id),
    cropName: crop?.name || farm?.primaryCropName || 'Cultura',
    campaignId: String(row.campaign_id),
    campaignName: campaign?.name || 'Campanha Agrícola',
    productId: String(row.product_id),
    productName,
    insuredCapitalAoa: Number(row.insured_capital_aoa),
    premiumAoa: Number(row.premium_aoa),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: row.status as InsurancePolicy['status'],
    contractTerms: {
      productVersionId: String(
        termsRow?.product_version_id || row.product_version_id
      ),
      productVersionNumber,
      coverageType: (termsRow?.coverage_type || 'drought') as InsurancePolicy['contractTerms']['coverageType'],
      climateIndicator: String(
        termsRow?.climate_indicator || 'Precipitação Acumulada (mm)'
      ),
      triggerThresholdMm: Number(termsRow?.trigger_threshold_mm ?? 0),
      observationWindowDays: Number(termsRow?.observation_window_days ?? 30),
      minDataCompletenessPercent: Number(
        termsRow?.min_data_completeness_percent ?? 85
      ),
      maxSourceDisagreementPercent: Number(
        termsRow?.max_source_disagreement_percent ?? 25
      ),
      severityBands: (termsRow?.severity_bands as SeverityBand[]) || [],
      termsAcceptedAt: String(termsRow?.terms_accepted_at || row.created_at),
      termsVersion: String(termsRow?.terms_version || 'v1.0-AO'),
      isSimulatedDemonstration: Boolean(
        termsRow?.is_simulated_demonstration ?? false
      ),
    },
    issuedAt: row.issued_at ? String(row.issued_at) : null,
    createdAt: String(row.created_at),
  }
}

function mapIndemnityRow(
  row: Record<string, unknown>,
  policyNumberById: Map<string, string>
): IndemnityCalculation {
  const policyId = String(row.policy_id)
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    policyId,
    policyNumber: policyNumberById.get(policyId) || policyId,
    insuredCapitalAoa: Number(row.insured_capital_aoa),
    observedPrecipitationMm: Number(row.observed_precipitation_mm),
    contractualThresholdMm: Number(row.contractual_threshold_mm),
    deviationPercent: Number(row.deviation_percent),
    severityLabel: String(row.severity_label),
    payoutPercentage: Number(row.payout_percentage),
    calculatedIndemnityAoa: Number(row.calculated_indemnity_aoa),
    cappedAtMaximum: Boolean(row.capped_at_maximum),
    explanation: String(row.explanation),
    evidenceSummary: String(row.evidence_summary),
    calculatedAt: String(row.calculated_at),
  }
}

function mapEventRow(
  row: Record<string, unknown>,
  policyById: Map<string, InsurancePolicy>,
  customerById: Map<string, CustomerRecord>,
  farmById: Map<string, FarmProperty>,
  indemnityByEventId: Map<string, IndemnityCalculation>
): ClimateEvent {
  const id = String(row.id)
  const policy = policyById.get(String(row.policy_id))
  const customer = customerById.get(String(row.customer_id))
  const farm = farmById.get(String(row.farm_id))
  const indemnity = indemnityByEventId.get(id)

  return {
    id,
    eventKey: String(row.event_key),
    policyId: String(row.policy_id),
    policyNumber: policy?.policyNumber || String(row.policy_id),
    customerId: String(row.customer_id),
    customerName: customer?.fullName || policy?.customerName || 'Segurado',
    farmId: String(row.farm_id),
    farmName: farm?.name || policy?.farmName || 'Propriedade',
    province: farm?.province || policy?.province || 'Huambo',
    coverageType: row.coverage_type as ClimateEvent['coverageType'],
    windowStart: String(row.window_start),
    windowEnd: String(row.window_end),
    observedPrecipitationMm:
      row.observed_precipitation_mm === null ||
      row.observed_precipitation_mm === undefined
        ? null
        : Number(row.observed_precipitation_mm),
    contractualThresholdMm: Number(row.contractual_threshold_mm),
    dataQualityStatus: row.data_quality_status as ClimateEvent['dataQualityStatus'],
    comparisonId: row.comparison_id ? String(row.comparison_id) : null,
    status: row.status as EventStatus,
    ruleAppliedExplanation: String(row.rule_applied_explanation),
    indemnityCalculationId: indemnity?.id ?? null,
    calculatedIndemnityAoa: indemnity?.calculatedIndemnityAoa ?? null,
    evidenceSummary: String(row.evidence_summary),
    isSimulatedScenario: Boolean(row.is_simulated_scenario),
    detectedAt: String(row.detected_at),
    updatedAt: String(row.updated_at),
  }
}

function mapExceptionRow(
  row: Record<string, unknown>,
  policyById: Map<string, InsurancePolicy>
): OperationalException {
  const policy = policyById.get(String(row.policy_id))
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    policyId: String(row.policy_id),
    policyNumber: policy?.policyNumber || String(row.policy_id),
    farmName: policy?.farmName || 'Propriedade',
    reasonCode: row.reason_code as OperationalException['reasonCode'],
    severity: row.severity as OperationalException['severity'],
    description: String(row.description),
    status: row.status as OperationalException['status'],
    assignedOperatorId: row.assigned_operator_id
      ? String(row.assigned_operator_id)
      : null,
    decisionReason: row.decision_reason ? String(row.decision_reason) : null,
    previousEventStatus: row.previous_event_status as EventStatus,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    createdAt: String(row.created_at),
  }
}

function mapPaymentRow(
  row: Record<string, unknown>,
  customerById: Map<string, CustomerRecord>,
  policyById: Map<string, InsurancePolicy>
): PaymentRecord {
  const customer = customerById.get(String(row.customer_id))
  const policy = policyById.get(String(row.policy_id))
  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    transactionReference: String(row.transaction_reference),
    kind: row.kind as PaymentRecord['kind'],
    customerId: String(row.customer_id),
    customerName: customer?.fullName || policy?.customerName || 'Segurado',
    policyId: String(row.policy_id),
    policyNumber: policy?.policyNumber || String(row.policy_id),
    eventId: row.event_id ? String(row.event_id) : null,
    amountAoa: Number(row.amount_aoa),
    channel: row.channel as PaymentRecord['channel'],
    status: row.status as PaymentRecord['status'],
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    isSimulated: true,
    createdAt: String(row.created_at),
    processedAt: row.processed_at ? String(row.processed_at) : null,
  }
}

function mapNotificationRow(row: Record<string, unknown>): PlatformNotification {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    targetRole: (row.target_role as UserRole | null) ?? null,
    title: String(row.title),
    message: String(row.message),
    category: row.category as PlatformNotification['category'],
    read: Boolean(row.is_read),
    relatedEntityType: row.related_entity_type
      ? String(row.related_entity_type)
      : null,
    relatedEntityId: row.related_entity_id ? String(row.related_entity_id) : null,
    createdAt: String(row.created_at),
  }
}

function mapSettingsRow(row: Record<string, unknown> | null): SystemSettings {
  if (!row) {
    return {
      defaultDisagreementThresholdPercent: 25,
      defaultMinCompletenessPercent: 85,
      autoIndemnityEnabled: true,
      demonstrationModeActive: false,
      primaryClimateProvider: 'open_meteo_era5',
      confirmationClimateProvider: 'nasa_power',
      updatedAt: new Date().toISOString(),
    }
  }
  return {
    defaultDisagreementThresholdPercent: Number(
      row.default_disagreement_threshold_percent
    ),
    defaultMinCompletenessPercent: Number(row.default_min_completeness_percent),
    autoIndemnityEnabled: Boolean(row.auto_indemnity_enabled),
    demonstrationModeActive: Boolean(row.demonstration_mode_active),
    primaryClimateProvider:
      row.primary_climate_provider as SystemSettings['primaryClimateProvider'],
    confirmationClimateProvider:
      row.confirmation_climate_provider as SystemSettings['confirmationClimateProvider'],
    updatedAt: String(row.updated_at),
  }
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`[Supabase:${context}] ${error.message}`)
  }
}

// ============================================================================
// LEITURA CONSOLIDADA DA PLATAFORMA (SSR E CONSULTAS DE PORTAL)
// ============================================================================

async function loadSupabaseFullState(
  admin: SupabaseClient,
  scope?: { role: UserRole; customerId?: string | null; userId?: string }
): Promise<PlatformViewState> {
  const isFarmer = scope?.role === 'farmer'
  const scopedCustomerId = isFarmer ? scope?.customerId ?? null : null

  const [
    cropsRes,
    campaignsRes,
    productsRes,
    versionsRes,
    providersRes,
    settingsRes,
  ] = await Promise.all([
    admin.from('crops').select('*').order('name'),
    admin.from('agricultural_campaigns').select('*').order('start_date', { ascending: false }),
    admin.from('insurance_products').select('*').order('created_at', { ascending: false }),
    admin.from('insurance_product_versions').select('*'),
    admin.from('climate_providers').select('*').order('role'),
    admin.from('system_settings').select('*').eq('id', 'global').maybeSingle(),
  ])

  assertNoError(cropsRes.error, 'crops')
  assertNoError(campaignsRes.error, 'agricultural_campaigns')
  assertNoError(productsRes.error, 'insurance_products')
  assertNoError(versionsRes.error, 'insurance_product_versions')
  assertNoError(providersRes.error, 'climate_providers')
  assertNoError(settingsRes.error, 'system_settings')

  const crops = (cropsRes.data || []).map(mapCropRow)
  const cropById = new Map(crops.map((c) => [c.id, c]))
  const cropNameById = new Map(crops.map((c) => [c.id, c.name]))
  const campaigns = (campaignsRes.data || []).map(mapCampaignRow)
  const campaignById = new Map(campaigns.map((c) => [c.id, c]))

  const versionsByProduct = new Map<string, Array<Record<string, unknown>>>()
  const versionNumberById = new Map<string, number>()
  for (const v of (versionsRes.data || []) as Array<Record<string, unknown>>) {
    const pid = String(v.product_id)
    const list = versionsByProduct.get(pid) || []
    list.push(v)
    versionsByProduct.set(pid, list)
    versionNumberById.set(String(v.id), Number(v.version_number))
  }

  const products = (productsRes.data || [])
    .map((p) =>
      mapProductRow(
        p as Record<string, unknown>,
        versionsByProduct.get(String(p.id)) || []
      )
    )
    .filter((p): p is InsuranceProduct => p !== null)
  const productNameById = new Map(products.map((p) => [p.id, p.name]))
  const productById = new Map(products.map((p) => [p.id, p]))

  const climateProviders = (providersRes.data || []).map(mapProviderRow)
  const providerNameByCode = new Map(climateProviders.map((p) => [p.code, p.name]))
  const settings = mapSettingsRow(
    (settingsRes.data as Record<string, unknown> | null) ?? null
  )

  // Consultas operacionais (com isolamento para agricultor ou carteira completa para equipa técnica)
  const customersQuery = isFarmer && scopedCustomerId
    ? admin.from('customers').select('*').eq('id', scopedCustomerId)
    : isFarmer
      ? admin.from('customers').select('*').eq('id', '00000000-0000-0000-0000-000000000000')
      : admin.from('customers').select('*').order('created_at', { ascending: false })

  const farmsQuery = isFarmer && scopedCustomerId
    ? admin.from('farms').select('*, farm_locations(*)').eq('customer_id', scopedCustomerId).order('created_at', { ascending: false })
    : isFarmer
      ? admin.from('farms').select('*, farm_locations(*)').eq('customer_id', '00000000-0000-0000-0000-000000000000')
      : admin.from('farms').select('*, farm_locations(*)').order('created_at', { ascending: false })

  const simQuery = isFarmer && scopedCustomerId
    ? admin.from('insurance_simulations').select('*').eq('customer_id', scopedCustomerId).order('created_at', { ascending: false })
    : isFarmer
      ? admin.from('insurance_simulations').select('*').eq('customer_id', '00000000-0000-0000-0000-000000000000')
      : admin.from('insurance_simulations').select('*').order('created_at', { ascending: false })

  const policiesQuery = isFarmer && scopedCustomerId
    ? admin.from('policies').select('*').eq('customer_id', scopedCustomerId).order('created_at', { ascending: false })
    : isFarmer
      ? admin.from('policies').select('*').eq('customer_id', '00000000-0000-0000-0000-000000000000')
      : admin.from('policies').select('*').order('created_at', { ascending: false })

  const eventsQuery = isFarmer && scopedCustomerId
    ? admin.from('climate_events').select('*').eq('customer_id', scopedCustomerId).order('detected_at', { ascending: false })
    : isFarmer
      ? admin.from('climate_events').select('*').eq('customer_id', '00000000-0000-0000-0000-000000000000')
      : admin.from('climate_events').select('*').order('detected_at', { ascending: false })

  const paymentsQuery = isFarmer && scopedCustomerId
    ? admin.from('payments').select('*').eq('customer_id', scopedCustomerId).order('created_at', { ascending: false })
    : isFarmer
      ? admin.from('payments').select('*').eq('customer_id', '00000000-0000-0000-0000-000000000000')
      : admin.from('payments').select('*').order('created_at', { ascending: false })

  const [
    customersRes,
    farmsRes,
    simRes,
    policiesRes,
    termsRes,
    obsRes,
    compRes,
    eventsRes,
    indRes,
    excRes,
    payRes,
    notifRes,
  ] = await Promise.all([
    customersQuery,
    farmsQuery,
    simQuery,
    policiesQuery,
    admin.from('policy_terms').select('*'),
    admin.from('climate_observations').select('*').order('observation_date', { ascending: false }).limit(500),
    admin.from('climate_source_comparisons').select('*').order('created_at', { ascending: false }).limit(150),
    eventsQuery,
    admin.from('indemnity_calculations').select('*').order('calculated_at', { ascending: false }),
    isFarmer
      ? Promise.resolve({ data: [], error: null })
      : admin.from('operational_exceptions').select('*').order('created_at', { ascending: false }),
    paymentsQuery,
    admin.from('notifications').select('*').order('created_at', { ascending: false }).limit(120),
  ])

  assertNoError(customersRes.error, 'customers')
  assertNoError(farmsRes.error, 'farms')
  assertNoError(simRes.error, 'insurance_simulations')
  assertNoError(policiesRes.error, 'policies')
  assertNoError(termsRes.error, 'policy_terms')
  assertNoError(obsRes.error, 'climate_observations')
  assertNoError(compRes.error, 'climate_source_comparisons')
  assertNoError(eventsRes.error, 'climate_events')
  assertNoError(indRes.error, 'indemnity_calculations')
  assertNoError(excRes.error, 'operational_exceptions')
  assertNoError(payRes.error, 'payments')
  assertNoError(notifRes.error, 'notifications')

  const customers = (customersRes.data || []).map(mapCustomerRow)
  const customerById = new Map(customers.map((c) => [c.id, c]))

  const farms = (farmsRes.data || []).map((f) =>
    mapFarmRow(f as Record<string, unknown>, cropNameById)
  )
  const farmById = new Map(farms.map((f) => [f.id, f]))

  const termsByPolicyId = new Map<string, Record<string, unknown>>()
  for (const t of (termsRes.data || []) as Array<Record<string, unknown>>) {
    termsByPolicyId.set(String(t.policy_id), t)
  }

  const policies = (policiesRes.data || []).map((p) => {
    const row = p as Record<string, unknown>
    const terms = termsByPolicyId.get(String(row.id))
    const verNum =
      versionNumberById.get(String(row.product_version_id)) || 1
    return mapPolicyRow(
      row,
      terms,
      verNum,
      customerById,
      farmById,
      cropById,
      campaignById,
      productNameById
    )
  })
  const policyById = new Map(policies.map((p) => [p.id, p]))
  const policyNumberById = new Map(policies.map((p) => [p.id, p.policyNumber]))
  const myPolicyIds = new Set(policies.map((p) => p.id))

  const simulations: InsuranceSimulation[] = (simRes.data || []).map((s) => {
    const row = s as Record<string, unknown>
    const farm = farmById.get(String(row.farm_id))
    const crop = cropById.get(String(row.crop_id))
    const campaign = campaignById.get(String(row.campaign_id))
    const product = productById.get(String(row.product_id))
    return {
      id: String(row.id),
      customerId: String(row.customer_id),
      farmId: String(row.farm_id),
      farmName: farm?.name || 'Propriedade',
      province: farm?.province || 'Huambo',
      cropId: String(row.crop_id),
      cropName: crop?.name || 'Cultura',
      campaignId: String(row.campaign_id),
      campaignName: campaign?.name || 'Campanha',
      productId: String(row.product_id),
      productVersionId: String(row.product_version_id),
      productName: product?.name || 'Produto Paramétrico',
      coverageType: product?.coverageType || 'drought',
      insuredCapitalAoa: Number(row.insured_capital_aoa),
      estimatedPremiumAoa: Number(row.estimated_premium_aoa),
      triggerThresholdMm: product?.triggerThresholdMm ?? 0,
      observationWindowDays: product?.observationWindowDays ?? 30,
      maxPossibleIndemnityAoa: Number(row.max_possible_indemnity_aoa),
      breakdown: row.breakdown as InsuranceSimulation['breakdown'],
      createdAt: String(row.created_at),
    }
  })

  const allIndemnities = (indRes.data || []).map((i) =>
    mapIndemnityRow(i as Record<string, unknown>, policyNumberById)
  )
  const indemnities = isFarmer
    ? allIndemnities.filter((i) => myPolicyIds.has(i.policyId))
    : allIndemnities
  const indemnityByEventId = new Map(indemnities.map((i) => [i.eventId, i]))

  const climateEvents = (eventsRes.data || []).map((e) =>
    mapEventRow(
      e as Record<string, unknown>,
      policyById,
      customerById,
      farmById,
      indemnityByEventId
    )
  )

  const exceptions = (excRes.data || []).map((ex) =>
    mapExceptionRow(ex as Record<string, unknown>, policyById)
  )

  const payments = (payRes.data || []).map((p) =>
    mapPaymentRow(p as Record<string, unknown>, customerById, policyById)
  )

  const rawObs = (obsRes.data || []).map((o) =>
    mapObservationRow(o as Record<string, unknown>, providerNameByCode)
  )
  const climateObservations = isFarmer
    ? rawObs.filter((o) =>
        farms.some(
          (f) =>
            Math.abs(o.latitude - f.latitude) < 0.15 &&
            Math.abs(o.longitude - f.longitude) < 0.15
        )
      )
    : rawObs

  const rawComparisons = (compRes.data || []).map(mapComparisonRow)
  const myFarmIds = new Set(farms.map((f) => f.id))
  const climateComparisons = isFarmer
    ? rawComparisons.filter((c) => myFarmIds.has(c.farmId))
    : rawComparisons

  const allNotifications = (notifRes.data || []).map(mapNotificationRow)
  const notifications = scope
    ? allNotifications.filter(
        (n) =>
          n.userId === scope.userId ||
          (n.userId === null && n.targetRole === scope.role) ||
          scope.role === 'manager'
      )
    : allNotifications

  return {
    storageMode: 'supabase',
    customers,
    crops,
    campaigns,
    farms,
    products,
    simulations,
    policies,
    climateProviders,
    climateObservations,
    climateComparisons,
    climateEvents,
    indemnities,
    exceptions,
    payments,
    notifications,
    settings,
  }
}

/**
 * Carrega o estado da plataforma a partir do PostgreSQL do Supabase (se configurado)
 * ou do repositório local de demonstração.
 */
export async function loadPlatformState(scope?: {
  role: UserRole
  customerId?: string | null
  userId?: string
}): Promise<PlatformViewState> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    return loadSupabaseFullState(admin, scope)
  }

  const db = getDemoDatabase()
  return {
    storageMode: 'demonstration',
    customers: db.customers,
    crops: db.crops,
    campaigns: db.campaigns,
    farms: db.farms,
    products: db.products,
    simulations: db.simulations,
    policies: db.policies,
    climateProviders: db.climateProviders,
    climateObservations: db.climateObservations,
    climateComparisons: db.climateComparisons,
    climateEvents: db.climateEvents,
    indemnities: db.indemnities,
    exceptions: db.exceptions,
    payments: db.payments,
    notifications: db.notifications,
    settings: db.settings,
  }
}

/**
 * Carrega apenas os catálogos públicos (culturas, campanhas e produtos activos).
 */
export async function loadPublicCatalog(): Promise<{
  crops: CropType[]
  campaigns: AgriculturalCampaign[]
  products: InsuranceProduct[]
  storageMode: 'supabase' | 'demonstration'
}> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const [cropsRes, campaignsRes, productsRes, versionsRes] = await Promise.all([
      admin.from('crops').select('*').order('name'),
      admin.from('agricultural_campaigns').select('*').order('start_date', { ascending: false }),
      admin.from('insurance_products').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      admin.from('insurance_product_versions').select('*'),
    ])
    assertNoError(cropsRes.error, 'public_crops')
    assertNoError(campaignsRes.error, 'public_campaigns')
    assertNoError(productsRes.error, 'public_products')
    assertNoError(versionsRes.error, 'public_product_versions')

    const versionsByProduct = new Map<string, Array<Record<string, unknown>>>()
    for (const v of (versionsRes.data || []) as Array<Record<string, unknown>>) {
      const pid = String(v.product_id)
      const list = versionsByProduct.get(pid) || []
      list.push(v)
      versionsByProduct.set(pid, list)
    }

    const products = (productsRes.data || [])
      .map((p) =>
        mapProductRow(
          p as Record<string, unknown>,
          versionsByProduct.get(String(p.id)) || []
        )
      )
      .filter((p): p is InsuranceProduct => p !== null)

    return {
      crops: (cropsRes.data || []).map(mapCropRow),
      campaigns: (campaignsRes.data || []).map(mapCampaignRow),
      products,
      storageMode: 'supabase',
    }
  }

  const db = getDemoDatabase()
  return {
    crops: db.crops,
    campaigns: db.campaigns,
    products: db.products.filter((p) => p.status === 'active'),
    storageMode: 'demonstration',
  }
}

export async function isDemoBannerActive(): Promise<boolean> {
  if (isSupabaseConfigured()) return false
  const db = getDemoDatabase()
  return db.settings.demonstrationModeActive
}

// ============================================================================
// OPERAÇÕES ESPECÍFICAS POR ENTIDADE (CRUD & NEGÓCIO)
// ============================================================================

export async function repoGetSystemSettings(): Promise<SystemSettings> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data, error } = await admin
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle()
    assertNoError(error, 'get_settings')
    return mapSettingsRow((data as Record<string, unknown> | null) ?? null)
  }
  return getDemoDatabase().settings
}

export async function repoUpdateSystemSettings(
  patch: Partial<
    Pick<
      SystemSettings,
      | 'defaultDisagreementThresholdPercent'
      | 'defaultMinCompletenessPercent'
      | 'autoIndemnityEnabled'
    >
  >
): Promise<{ previousState: SystemSettings; newState: SystemSettings }> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const previousState = await repoGetSystemSettings()
    const { data, error } = await admin
      .from('system_settings')
      .update({
        ...(patch.defaultDisagreementThresholdPercent !== undefined
          ? {
              default_disagreement_threshold_percent:
                patch.defaultDisagreementThresholdPercent,
            }
          : {}),
        ...(patch.defaultMinCompletenessPercent !== undefined
          ? {
              default_min_completeness_percent:
                patch.defaultMinCompletenessPercent,
            }
          : {}),
        ...(patch.autoIndemnityEnabled !== undefined
          ? { auto_indemnity_enabled: patch.autoIndemnityEnabled }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'global')
      .select('*')
      .single()
    assertNoError(error, 'update_settings')
    return {
      previousState,
      newState: mapSettingsRow(data as Record<string, unknown>),
    }
  }

  const db = getDemoDatabase()
  const previousState = { ...db.settings }
  Object.assign(db.settings, patch, { updatedAt: new Date().toISOString() })
  saveDemoDatabase(db)
  return { previousState, newState: { ...db.settings } }
}

export async function repoUpdateProfile(
  userId: string,
  patch: {
    fullName?: string
    phone?: string
    province?: string
    municipality?: string
  }
) {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data: existingProfile, error: pErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    assertNoError(pErr, 'get_profile')
    if (!existingProfile) {
      throw new RepositoryNotFoundError('Perfil não encontrado.')
    }

    const previousState = {
      fullName: existingProfile.full_name,
      phone: existingProfile.phone,
      province: existingProfile.province,
      municipality: existingProfile.municipality,
    }

    const nowIso = new Date().toISOString()
    const updatePayload = {
      full_name: patch.fullName ?? existingProfile.full_name,
      phone: patch.phone ?? existingProfile.phone,
      province: patch.province ?? existingProfile.province,
      municipality: patch.municipality ?? existingProfile.municipality,
      updated_at: nowIso,
    }

    const { data: updatedProfile, error: upErr } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*')
      .single()
    assertNoError(upErr, 'update_profile')

    const { data: updatedCustomer } = await admin
      .from('customers')
      .update(updatePayload)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle()

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    return {
      previousState,
      user: {
        id: String(updatedProfile.id),
        email: String(updatedProfile.email),
        fullName: String(updatedProfile.full_name),
        phone: String(updatedProfile.phone),
        nif: String(updatedProfile.nif),
        province: String(updatedProfile.province),
        municipality: String(updatedProfile.municipality),
        role: (roleRow?.role || 'farmer') as UserRole,
        createdAt: String(updatedProfile.created_at),
      },
      customer: updatedCustomer
        ? mapCustomerRow(updatedCustomer as Record<string, unknown>)
        : null,
    }
  }

  const db = getDemoDatabase()
  const userRecord = db.users.find((u) => u.id === userId)
  if (!userRecord) throw new RepositoryNotFoundError('Perfil não encontrado.')
  const previousState = {
    fullName: userRecord.fullName,
    phone: userRecord.phone,
    province: userRecord.province,
    municipality: userRecord.municipality,
  }
  if (patch.fullName) userRecord.fullName = patch.fullName
  if (patch.phone) userRecord.phone = patch.phone
  if (patch.province) userRecord.province = patch.province
  if (patch.municipality) userRecord.municipality = patch.municipality

  const customer = db.customers.find((c) => c.userId === userRecord.id) ?? null
  if (customer) {
    customer.fullName = userRecord.fullName
    customer.phone = userRecord.phone
    customer.province = userRecord.province
    customer.municipality = userRecord.municipality
  }
  saveDemoDatabase(db)

  const { passwordHash: _ignored, ...safeUser } = userRecord
  void _ignored
  return { previousState, user: safeUser, customer }
}

// ----------------------------------------------------------------------------
// PROPRIEDADES AGRÍCOLAS
// ----------------------------------------------------------------------------

export async function repoListFarms(scope: {
  role: UserRole
  customerId?: string | null
}): Promise<FarmProperty[]> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const [cropsRes, farmsRes] = await Promise.all([
      admin.from('crops').select('id, name'),
      scope.role === 'farmer'
        ? scope.customerId
          ? admin
              .from('farms')
              .select('*, farm_locations(*)')
              .eq('customer_id', scope.customerId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null })
        : admin
            .from('farms')
            .select('*, farm_locations(*)')
            .order('created_at', { ascending: false }),
    ])
    assertNoError(cropsRes.error, 'list_farms_crops')
    assertNoError(farmsRes.error, 'list_farms')
    const cropMap = new Map(
      (cropsRes.data || []).map((c) => [String(c.id), String(c.name)])
    )
    return (farmsRes.data || []).map((f) =>
      mapFarmRow(f as Record<string, unknown>, cropMap)
    )
  }

  const db = getDemoDatabase()
  return scope.role === 'farmer'
    ? db.farms.filter((f) => f.customerId === scope.customerId)
    : db.farms
}

export async function repoGetFarmById(id: string): Promise<FarmProperty | null> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data, error } = await admin
      .from('farms')
      .select('*, farm_locations(*)')
      .eq('id', id)
      .maybeSingle()
    assertNoError(error, 'get_farm')
    if (!data) return null
    const { data: cropRow } = await admin
      .from('crops')
      .select('id, name')
      .eq('id', data.primary_crop_id)
      .maybeSingle()
    const cropMap = new Map(
      cropRow ? [[String(cropRow.id), String(cropRow.name)]] : []
    )
    return mapFarmRow(data as Record<string, unknown>, cropMap)
  }

  return getDemoDatabase().farms.find((f) => f.id === id) ?? null
}

export async function repoCreateFarm(input: {
  customerId: string
  name: string
  province: string
  municipality: string
  commune: string
  latitude: number
  longitude: number
  areaHectares: number
  primaryCropId: string
  soilType: string
  irrigationType: 'rainfed' | 'partial_irrigation'
}): Promise<FarmProperty> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data: cropRow, error: cropErr } = await admin
      .from('crops')
      .select('id, name')
      .eq('id', input.primaryCropId)
      .maybeSingle()
    assertNoError(cropErr, 'create_farm_crop')
    if (!cropRow) {
      throw new Error('Cultura agrícola inválida.')
    }

    const { data: farmRow, error: farmErr } = await admin
      .from('farms')
      .insert({
        customer_id: input.customerId,
        name: input.name,
        area_hectares: input.areaHectares,
        primary_crop_id: cropRow.id,
        soil_type: input.soilType,
        irrigation_type: input.irrigationType,
      })
      .select('*')
      .single()
    assertNoError(farmErr, 'insert_farm')

    const { error: locErr } = await admin.from('farm_locations').insert({
      farm_id: farmRow.id,
      province: input.province,
      municipality: input.municipality,
      commune: input.commune,
      latitude: input.latitude,
      longitude: input.longitude,
      geom: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
    })
    if (locErr) {
      await admin.from('farms').delete().eq('id', farmRow.id)
      throw new Error(`[Supabase:insert_farm_location] ${locErr.message}`)
    }

    return {
      id: String(farmRow.id),
      customerId: String(farmRow.customer_id),
      name: String(farmRow.name),
      province: input.province,
      municipality: input.municipality,
      commune: input.commune,
      latitude: input.latitude,
      longitude: input.longitude,
      areaHectares: Number(farmRow.area_hectares),
      primaryCropId: String(cropRow.id),
      primaryCropName: String(cropRow.name),
      soilType: String(farmRow.soil_type),
      irrigationType: farmRow.irrigation_type as FarmProperty['irrigationType'],
      createdAt: String(farmRow.created_at),
    }
  }

  const db = getDemoDatabase()
  const crop = db.crops.find((c) => c.id === input.primaryCropId)
  if (!crop) throw new Error('Cultura agrícola inválida.')
  const newFarm: FarmProperty = {
    id: generateId('farm'),
    customerId: input.customerId,
    name: input.name,
    province: input.province,
    municipality: input.municipality,
    commune: input.commune,
    latitude: input.latitude,
    longitude: input.longitude,
    areaHectares: input.areaHectares,
    primaryCropId: crop.id,
    primaryCropName: crop.name,
    soilType: input.soilType,
    irrigationType: input.irrigationType,
    createdAt: new Date().toISOString(),
  }
  db.farms.unshift(newFarm)
  saveDemoDatabase(db)
  return newFarm
}

export async function repoUpdateFarm(
  id: string,
  patch: Partial<{
    name: string
    province: string
    municipality: string
    commune: string
    latitude: number
    longitude: number
    areaHectares: number
    primaryCropId: string
    soilType: string
    irrigationType: 'rainfed' | 'partial_irrigation'
  }>
): Promise<{ previousState: FarmProperty; farm: FarmProperty }> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const existing = await repoGetFarmById(id)
    if (!existing) throw new RepositoryNotFoundError('Propriedade não encontrada.')

    if (patch.primaryCropId) {
      const { data: cropRow } = await admin
        .from('crops')
        .select('id')
        .eq('id', patch.primaryCropId)
        .maybeSingle()
      if (!cropRow) throw new Error('Cultura agrícola inválida.')
    }

    const { error: farmErr } = await admin
      .from('farms')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.areaHectares !== undefined
          ? { area_hectares: patch.areaHectares }
          : {}),
        ...(patch.primaryCropId !== undefined
          ? { primary_crop_id: patch.primaryCropId }
          : {}),
        ...(patch.soilType !== undefined ? { soil_type: patch.soilType } : {}),
        ...(patch.irrigationType !== undefined
          ? { irrigation_type: patch.irrigationType }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    assertNoError(farmErr, 'update_farm')

    const nextLat = patch.latitude ?? existing.latitude
    const nextLng = patch.longitude ?? existing.longitude
    if (
      patch.province !== undefined ||
      patch.municipality !== undefined ||
      patch.commune !== undefined ||
      patch.latitude !== undefined ||
      patch.longitude !== undefined
    ) {
      const { error: locErr } = await admin
        .from('farm_locations')
        .update({
          ...(patch.province !== undefined ? { province: patch.province } : {}),
          ...(patch.municipality !== undefined
            ? { municipality: patch.municipality }
            : {}),
          ...(patch.commune !== undefined ? { commune: patch.commune } : {}),
          latitude: nextLat,
          longitude: nextLng,
          geom: `SRID=4326;POINT(${nextLng} ${nextLat})`,
        })
        .eq('farm_id', id)
      assertNoError(locErr, 'update_farm_location')
    }

    const updated = await repoGetFarmById(id)
    if (!updated) throw new RepositoryNotFoundError('Propriedade não encontrada.')
    return { previousState: existing, farm: updated }
  }

  const db = getDemoDatabase()
  const farm = db.farms.find((f) => f.id === id)
  if (!farm) throw new RepositoryNotFoundError('Propriedade não encontrada.')
  const previousState = { ...farm }
  Object.assign(farm, patch)
  if (patch.primaryCropId) {
    const crop = db.crops.find((c) => c.id === patch.primaryCropId)
    if (crop) farm.primaryCropName = crop.name
  }
  saveDemoDatabase(db)
  return { previousState, farm }
}

export async function repoDeleteFarm(id: string): Promise<FarmProperty> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const existing = await repoGetFarmById(id)
    if (!existing) throw new RepositoryNotFoundError('Propriedade não encontrada.')

    const { data: activePol } = await admin
      .from('policies')
      .select('id')
      .eq('farm_id', id)
      .eq('status', 'active')
      .limit(1)
    if (activePol && activePol.length > 0) {
      throw new RepositoryConflictError(
        'Não é possível eliminar propriedade com apólice activa associada.'
      )
    }

    const { error } = await admin.from('farms').delete().eq('id', id)
    assertNoError(error, 'delete_farm')
    return existing
  }

  const db = getDemoDatabase()
  const idx = db.farms.findIndex((f) => f.id === id)
  if (idx === -1) throw new RepositoryNotFoundError('Propriedade não encontrada.')
  const farm = db.farms[idx]
  if (db.policies.some((p) => p.farmId === id && p.status === 'active')) {
    throw new RepositoryConflictError(
      'Não é possível eliminar propriedade com apólice activa associada.'
    )
  }
  db.farms.splice(idx, 1)
  saveDemoDatabase(db)
  return farm
}

// ----------------------------------------------------------------------------
// PRODUTOS VERSIONADOS
// ----------------------------------------------------------------------------

export async function repoListProducts(): Promise<InsuranceProduct[]> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const [pRes, vRes] = await Promise.all([
      admin.from('insurance_products').select('*').order('created_at', { ascending: false }),
      admin.from('insurance_product_versions').select('*'),
    ])
    assertNoError(pRes.error, 'list_products')
    assertNoError(vRes.error, 'list_product_versions')
    const vMap = new Map<string, Array<Record<string, unknown>>>()
    for (const v of (vRes.data || []) as Array<Record<string, unknown>>) {
      const pid = String(v.product_id)
      const arr = vMap.get(pid) || []
      arr.push(v)
      vMap.set(pid, arr)
    }
    return (pRes.data || [])
      .map((p) =>
        mapProductRow(p as Record<string, unknown>, vMap.get(String(p.id)) || [])
      )
      .filter((p): p is InsuranceProduct => p !== null)
  }
  return getDemoDatabase().products
}

export async function repoGetProductById(
  id: string
): Promise<InsuranceProduct | null> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const [pRes, vRes] = await Promise.all([
      admin.from('insurance_products').select('*').eq('id', id).maybeSingle(),
      admin.from('insurance_product_versions').select('*').eq('product_id', id),
    ])
    assertNoError(pRes.error, 'get_product')
    assertNoError(vRes.error, 'get_product_versions')
    if (!pRes.data) return null
    return mapProductRow(
      pRes.data as Record<string, unknown>,
      (vRes.data || []) as Array<Record<string, unknown>>
    )
  }
  return getDemoDatabase().products.find((p) => p.id === id) ?? null
}

export async function repoCreateProduct(input: {
  code: string
  name: string
  description: string
  coverageType: 'drought' | 'excess_rain'
  supportedCropIds: string[]
  supportedProvinces: string[]
  minCapitalAoa: number
  maxCapitalAoa: number
  basePremiumRate: number
  minPremiumAoa: number
  triggerThresholdMm: number
  observationWindowDays: number
  maxSourceDisagreementPercent: number
  minDataCompletenessPercent: number
  severityBands: SeverityBand[]
}): Promise<InsuranceProduct> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const upperCode = input.code.toUpperCase()
    const { data: existing } = await admin
      .from('insurance_products')
      .select('id')
      .ilike('code', upperCode)
      .maybeSingle()
    if (existing) {
      throw new RepositoryConflictError('Já existe um produto com este código.')
    }

    const { data: prodRow, error: prodErr } = await admin
      .from('insurance_products')
      .insert({
        code: upperCode,
        name: input.name,
        description: input.description,
        coverage_type: input.coverageType,
        status: 'active',
        active_version_number: 1,
      })
      .select('*')
      .single()
    assertNoError(prodErr, 'insert_product')

    const { data: verRow, error: verErr } = await admin
      .from('insurance_product_versions')
      .insert({
        product_id: prodRow.id,
        version_number: 1,
        supported_crop_ids: input.supportedCropIds,
        supported_provinces: input.supportedProvinces,
        min_capital_aoa: input.minCapitalAoa,
        max_capital_aoa: input.maxCapitalAoa,
        base_premium_rate: input.basePremiumRate,
        min_premium_aoa: input.minPremiumAoa,
        trigger_threshold_mm: input.triggerThresholdMm,
        observation_window_days: input.observationWindowDays,
        max_source_disagreement_percent: input.maxSourceDisagreementPercent,
        min_data_completeness_percent: input.minDataCompletenessPercent,
        severity_bands: input.severityBands,
      })
      .select('*')
      .single()

    if (verErr || !verRow) {
      await admin.from('insurance_products').delete().eq('id', prodRow.id)
      throw new Error(
        `[Supabase:insert_product_version] ${verErr?.message || 'Erro desconhecido'}`
      )
    }

    await admin.from('insurance_coverages').insert({
      product_version_id: verRow.id,
      climate_indicator: `Precipitação Acumulada em ${input.observationWindowDays} dias`,
      unit: 'mm',
      coverage_description: input.description,
    })

    return mapProductRow(
      prodRow as Record<string, unknown>,
      [verRow as Record<string, unknown>]
    )!
  }

  const db = getDemoDatabase()
  if (db.products.some((p) => p.code.toLowerCase() === input.code.toLowerCase())) {
    throw new RepositoryConflictError('Já existe um produto com este código.')
  }
  const nowIso = new Date().toISOString()
  const product: InsuranceProduct = {
    id: generateId('prod'),
    code: input.code.toUpperCase(),
    name: input.name,
    description: input.description,
    coverageType: input.coverageType,
    activeVersionId: generateId('ver-prod'),
    activeVersionNumber: 1,
    status: 'active',
    supportedCropIds: input.supportedCropIds,
    supportedProvinces: input.supportedProvinces,
    minCapitalAoa: input.minCapitalAoa,
    maxCapitalAoa: input.maxCapitalAoa,
    basePremiumRate: input.basePremiumRate,
    minPremiumAoa: input.minPremiumAoa,
    triggerThresholdMm: input.triggerThresholdMm,
    observationWindowDays: input.observationWindowDays,
    maxSourceDisagreementPercent: input.maxSourceDisagreementPercent,
    minDataCompletenessPercent: input.minDataCompletenessPercent,
    severityBands: input.severityBands,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  db.products.unshift(product)
  saveDemoDatabase(db)
  return product
}

export async function repoUpdateProductVersion(
  id: string,
  patch: Partial<InsuranceProduct>
): Promise<{ previousState: Record<string, unknown>; product: InsuranceProduct }> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const current = await repoGetProductById(id)
    if (!current) throw new RepositoryNotFoundError('Produto não encontrado.')

    const previousState = {
      version: current.activeVersionNumber,
      triggerThresholdMm: current.triggerThresholdMm,
      basePremiumRate: current.basePremiumRate,
      observationWindowDays: current.observationWindowDays,
    }

    const nextVersion = current.activeVersionNumber + 1
    const nowIso = new Date().toISOString()

    const { data: prodRow, error: prodErr } = await admin
      .from('insurance_products')
      .update({
        name: patch.name ?? current.name,
        description: patch.description ?? current.description,
        coverage_type: patch.coverageType ?? current.coverageType,
        status: patch.status ?? current.status,
        active_version_number: nextVersion,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single()
    assertNoError(prodErr, 'update_product')

    const { data: verRow, error: verErr } = await admin
      .from('insurance_product_versions')
      .insert({
        product_id: id,
        version_number: nextVersion,
        supported_crop_ids: patch.supportedCropIds ?? current.supportedCropIds,
        supported_provinces: patch.supportedProvinces ?? current.supportedProvinces,
        min_capital_aoa: patch.minCapitalAoa ?? current.minCapitalAoa,
        max_capital_aoa: patch.maxCapitalAoa ?? current.maxCapitalAoa,
        base_premium_rate: patch.basePremiumRate ?? current.basePremiumRate,
        min_premium_aoa: patch.minPremiumAoa ?? current.minPremiumAoa,
        trigger_threshold_mm: patch.triggerThresholdMm ?? current.triggerThresholdMm,
        observation_window_days:
          patch.observationWindowDays ?? current.observationWindowDays,
        max_source_disagreement_percent:
          patch.maxSourceDisagreementPercent ?? current.maxSourceDisagreementPercent,
        min_data_completeness_percent:
          patch.minDataCompletenessPercent ?? current.minDataCompletenessPercent,
        severity_bands: patch.severityBands ?? current.severityBands,
      })
      .select('*')
      .single()
    assertNoError(verErr, 'insert_new_product_version')

    return {
      previousState,
      product: mapProductRow(
        prodRow as Record<string, unknown>,
        [verRow as Record<string, unknown>]
      )!,
    }
  }

  const db = getDemoDatabase()
  const product = db.products.find((p) => p.id === id)
  if (!product) throw new RepositoryNotFoundError('Produto não encontrado.')
  const previousState = {
    version: product.activeVersionNumber,
    triggerThresholdMm: product.triggerThresholdMm,
    basePremiumRate: product.basePremiumRate,
    observationWindowDays: product.observationWindowDays,
  }
  Object.assign(product, patch)
  product.activeVersionNumber += 1
  product.activeVersionId = generateId('ver-prod')
  product.updatedAt = new Date().toISOString()
  saveDemoDatabase(db)
  return { previousState, product }
}

// ----------------------------------------------------------------------------
// SIMULAÇÕES E APÓLICES (COM SEQUÊNCIA ATÓMICA E TERMOS IMUTÁVEIS)
// ----------------------------------------------------------------------------

export async function repoSaveSimulation(
  simulation: Omit<InsuranceSimulation, 'id' | 'createdAt'>
): Promise<InsuranceSimulation> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data, error } = await admin
      .from('insurance_simulations')
      .insert({
        customer_id: simulation.customerId,
        farm_id: simulation.farmId,
        crop_id: simulation.cropId,
        campaign_id: simulation.campaignId,
        product_id: simulation.productId,
        product_version_id: simulation.productVersionId,
        insured_capital_aoa: simulation.insuredCapitalAoa,
        estimated_premium_aoa: simulation.estimatedPremiumAoa,
        max_possible_indemnity_aoa: simulation.maxPossibleIndemnityAoa,
        breakdown: simulation.breakdown,
      })
      .select('*')
      .single()
    assertNoError(error, 'insert_simulation')
    return {
      ...simulation,
      id: String(data.id),
      createdAt: String(data.created_at),
    }
  }

  const db = getDemoDatabase()
  const saved: InsuranceSimulation = {
    ...simulation,
    id: generateId('sim'),
    createdAt: new Date().toISOString(),
  }
  db.simulations.unshift(saved)
  saveDemoDatabase(db)
  return saved
}

export async function repoCreatePolicyFromSimulation(params: {
  simulationId: string
  actorRole: UserRole
  actorCustomerId: string | null
  startDate?: string
}): Promise<InsurancePolicy> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()

    const { data: simRow, error: simErr } = await admin
      .from('insurance_simulations')
      .select('*')
      .eq('id', params.simulationId)
      .maybeSingle()
    assertNoError(simErr, 'get_simulation')
    if (!simRow) throw new RepositoryNotFoundError('Simulação não encontrada.')

    if (
      params.actorRole === 'farmer' &&
      String(simRow.customer_id) !== params.actorCustomerId
    ) {
      throw new Error('FORBIDDEN_SIMULATION')
    }

    // Impede duplicação de apólice não-cancelada para a mesma simulação
    const { data: existingPol } = await admin
      .from('policies')
      .select('id')
      .eq('simulation_id', params.simulationId)
      .neq('status', 'cancelled')
      .maybeSingle()
    if (existingPol) {
      throw new RepositoryConflictError(
        'Já existe uma apólice emitida ou pendente de pagamento para esta simulação.'
      )
    }

    const [custRes, farmRes, campRes, prodRes, verRes, settings] =
      await Promise.all([
        admin.from('customers').select('*').eq('id', simRow.customer_id).single(),
        admin
          .from('farms')
          .select('*, farm_locations(*)')
          .eq('id', simRow.farm_id)
          .single(),
        admin
          .from('agricultural_campaigns')
          .select('*')
          .eq('id', simRow.campaign_id)
          .single(),
        admin
          .from('insurance_products')
          .select('*')
          .eq('id', simRow.product_id)
          .single(),
        admin
          .from('insurance_product_versions')
          .select('*')
          .eq('id', simRow.product_version_id)
          .single(),
        repoGetSystemSettings(),
      ])

    const { data: cropRow } = await admin
      .from('crops')
      .select('*')
      .eq('id', simRow.crop_id)
      .single()

    if (
      !custRes.data ||
      !farmRes.data ||
      !campRes.data ||
      !prodRes.data ||
      !verRes.data ||
      !cropRow
    ) {
      throw new Error('Referências contratuais incompletas.')
    }

    const year = new Date().getUTCFullYear()
    const { data: policyNumber, error: seqErr } = await admin.rpc(
      'next_policy_number',
      { p_year: year }
    )
    assertNoError(seqErr, 'next_policy_number')

    const nowIso = new Date().toISOString()
    const obsDays = Number(verRes.data.observation_window_days)
    const covType = prodRes.data.coverage_type as 'drought' | 'excess_rain'
    const indicatorLabel =
      covType === 'drought'
        ? `Precipitação Acumulada em ${obsDays} dias (Limiar Mínimo)`
        : `Precipitação Acumulada em ${obsDays} dias (Limiar Máximo)`

    const startDate = params.startDate || String(campRes.data.start_date)
    const endDate = String(campRes.data.end_date)

    const { data: polRow, error: polErr } = await admin
      .from('policies')
      .insert({
        policy_number: String(policyNumber),
        simulation_id: simRow.id,
        customer_id: custRes.data.id,
        farm_id: farmRes.data.id,
        crop_id: cropRow.id,
        campaign_id: campRes.data.id,
        product_id: prodRes.data.id,
        product_version_id: verRes.data.id,
        insured_capital_aoa: simRow.insured_capital_aoa,
        premium_aoa: simRow.estimated_premium_aoa,
        start_date: startDate,
        end_date: endDate,
        status: 'pending_payment',
        issued_at: null,
      })
      .select('*')
      .single()

    if (polErr) {
      if (polErr.code === '23505') {
        throw new RepositoryConflictError(
          'Já existe uma apólice activa ou pendente para esta simulação.'
        )
      }
      throw new Error(`[Supabase:insert_policy] ${polErr.message}`)
    }

    const { error: termsErr } = await admin.from('policy_terms').insert({
      policy_id: polRow.id,
      product_version_id: verRes.data.id,
      coverage_type: covType,
      climate_indicator: indicatorLabel,
      trigger_threshold_mm: verRes.data.trigger_threshold_mm,
      observation_window_days: obsDays,
      min_data_completeness_percent: verRes.data.min_data_completeness_percent,
      max_source_disagreement_percent:
        verRes.data.max_source_disagreement_percent,
      severity_bands: verRes.data.severity_bands,
      terms_version: 'v1.0-AO',
      terms_accepted_at: nowIso,
      is_simulated_demonstration: settings.demonstrationModeActive,
    })

    if (termsErr) {
      await admin.from('policies').delete().eq('id', polRow.id)
      throw new Error(`[Supabase:insert_policy_terms] ${termsErr.message}`)
    }

    const loc = Array.isArray(farmRes.data.farm_locations)
      ? farmRes.data.farm_locations[0]
      : farmRes.data.farm_locations

    return {
      id: String(polRow.id),
      policyNumber: String(polRow.policy_number),
      simulationId: String(polRow.simulation_id),
      customerId: String(custRes.data.id),
      customerName: String(custRes.data.full_name),
      farmId: String(farmRes.data.id),
      farmName: String(farmRes.data.name),
      province: String(loc?.province || custRes.data.province),
      municipality: String(loc?.municipality || custRes.data.municipality),
      latitude: Number(loc?.latitude ?? -12.85),
      longitude: Number(loc?.longitude ?? 15.56),
      cropId: String(cropRow.id),
      cropName: String(cropRow.name),
      campaignId: String(campRes.data.id),
      campaignName: String(campRes.data.name),
      productId: String(prodRes.data.id),
      productName: String(prodRes.data.name),
      insuredCapitalAoa: Number(polRow.insured_capital_aoa),
      premiumAoa: Number(polRow.premium_aoa),
      startDate,
      endDate,
      status: 'pending_payment',
      contractTerms: {
        productVersionId: String(verRes.data.id),
        productVersionNumber: Number(verRes.data.version_number),
        coverageType: covType,
        climateIndicator: indicatorLabel,
        triggerThresholdMm: Number(verRes.data.trigger_threshold_mm),
        observationWindowDays: obsDays,
        minDataCompletenessPercent: Number(
          verRes.data.min_data_completeness_percent
        ),
        maxSourceDisagreementPercent: Number(
          verRes.data.max_source_disagreement_percent
        ),
        severityBands: verRes.data.severity_bands as SeverityBand[],
        termsAcceptedAt: nowIso,
        termsVersion: 'v1.0-AO',
        isSimulatedDemonstration: settings.demonstrationModeActive,
      },
      issuedAt: null,
      createdAt: String(polRow.created_at),
    }
  }

  // Fallback Demonstração
  const db = getDemoDatabase()
  const simulation = db.simulations.find((s) => s.id === params.simulationId)
  if (!simulation) throw new RepositoryNotFoundError('Simulação não encontrada.')
  if (
    params.actorRole === 'farmer' &&
    simulation.customerId !== params.actorCustomerId
  ) {
    throw new Error('FORBIDDEN_SIMULATION')
  }
  if (
    db.policies.some(
      (p) => p.simulationId === params.simulationId && p.status !== 'cancelled'
    )
  ) {
    throw new RepositoryConflictError(
      'Já existe uma apólice emitida ou pendente de pagamento para esta simulação.'
    )
  }

  const customer = db.customers.find((c) => c.id === simulation.customerId)
  const farm = db.farms.find((f) => f.id === simulation.farmId)
  const campaign = db.campaigns.find((c) => c.id === simulation.campaignId)
  const product = db.products.find((p) => p.id === simulation.productId)
  if (!customer || !farm || !campaign || !product) {
    throw new Error('Referências contratuais incompletas.')
  }

  const nowIso = new Date().toISOString()
  const policyNumber = allocateDemoPolicyNumber(db, new Date().getUTCFullYear())
  const indicatorLabel =
    product.coverageType === 'drought'
      ? `Precipitação Acumulada em ${product.observationWindowDays} dias (Limiar Mínimo)`
      : `Precipitação Acumulada em ${product.observationWindowDays} dias (Limiar Máximo)`

  const policy: InsurancePolicy = {
    id: generateId('pol'),
    policyNumber,
    simulationId: simulation.id,
    customerId: customer.id,
    customerName: customer.fullName,
    farmId: farm.id,
    farmName: farm.name,
    province: farm.province,
    municipality: farm.municipality,
    latitude: farm.latitude,
    longitude: farm.longitude,
    cropId: simulation.cropId,
    cropName: simulation.cropName,
    campaignId: campaign.id,
    campaignName: campaign.name,
    productId: product.id,
    productName: product.name,
    insuredCapitalAoa: simulation.insuredCapitalAoa,
    premiumAoa: simulation.estimatedPremiumAoa,
    startDate: params.startDate || campaign.startDate,
    endDate: campaign.endDate,
    status: 'pending_payment',
    contractTerms: {
      productVersionId: product.activeVersionId,
      productVersionNumber: product.activeVersionNumber,
      coverageType: product.coverageType,
      climateIndicator: indicatorLabel,
      triggerThresholdMm: product.triggerThresholdMm,
      observationWindowDays: product.observationWindowDays,
      minDataCompletenessPercent: product.minDataCompletenessPercent,
      maxSourceDisagreementPercent: product.maxSourceDisagreementPercent,
      severityBands: JSON.parse(JSON.stringify(product.severityBands)),
      termsAcceptedAt: nowIso,
      termsVersion: 'v1.0-AO',
      isSimulatedDemonstration: true,
    },
    issuedAt: null,
    createdAt: nowIso,
  }
  db.policies.unshift(policy)
  saveDemoDatabase(db)
  return policy
}

// ----------------------------------------------------------------------------
// CLIMA, OBSERVAÇÕES E COMPARAÇÕES
// ----------------------------------------------------------------------------

export async function repoSaveClimateObservations(params: {
  observations: ClimateObservation[]
  farmId?: string
  providerCode: ClimateObservation['providerCode']
  requestUrl: string
  windowStart: string
  windowEnd: string
  isSimulatedData: boolean
}): Promise<number> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data: impRow } = await admin
      .from('climate_data_imports')
      .insert({
        provider_code: params.providerCode,
        farm_id: params.farmId ?? null,
        request_url: params.requestUrl,
        window_start: params.windowStart,
        window_end: params.windowEnd,
        records_imported: params.observations.length,
        is_simulated_data: params.isSimulatedData,
      })
      .select('id')
      .maybeSingle()

    const rows = params.observations.map((obs) => ({
      import_id: impRow?.id ?? null,
      provider_code: obs.providerCode,
      latitude: Number(obs.latitude.toFixed(6)),
      longitude: Number(obs.longitude.toFixed(6)),
      observation_date: obs.observationDate,
      precipitation_mm: obs.precipitationMm,
      unit: 'mm',
      retrieved_at: obs.retrievedAt,
      source_url: obs.sourceUrl,
      spatial_resolution: obs.spatialResolution,
      quality_status: obs.qualityStatus,
      is_simulated_data: obs.isSimulatedData,
      raw_payload_reference: obs.rawPayloadReference,
      validation_notes: obs.validationNotes,
    }))

    if (rows.length > 0) {
      const { error } = await admin.from('climate_observations').upsert(rows, {
        onConflict: 'provider_code,latitude,longitude,observation_date',
        ignoreDuplicates: true,
      })
      assertNoError(error, 'upsert_climate_observations')
    }
    return rows.length
  }

  const db = getDemoDatabase()
  let insertedCount = 0
  for (const obs of params.observations) {
    const exists = db.climateObservations.some(
      (existing) =>
        existing.providerCode === obs.providerCode &&
        existing.observationDate === obs.observationDate &&
        Math.abs(existing.latitude - obs.latitude) < 0.05 &&
        Math.abs(existing.longitude - obs.longitude) < 0.05
    )
    if (!exists) {
      db.climateObservations.unshift(obs)
      insertedCount += 1
    }
  }
  saveDemoDatabase(db)
  return insertedCount
}

export async function repoSaveClimateComparison(
  comparison: ClimateSourceComparison
): Promise<ClimateSourceComparison> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data, error } = await admin
      .from('climate_source_comparisons')
      .insert({
        farm_id: comparison.farmId,
        policy_id: comparison.policyId,
        window_start: comparison.windowStart,
        window_end: comparison.windowEnd,
        primary_provider: comparison.primaryProvider,
        secondary_provider: comparison.secondaryProvider,
        primary_accumulated_mm: comparison.primaryAccumulatedMm,
        secondary_accumulated_mm: comparison.secondaryAccumulatedMm,
        disagreement_percent: comparison.disagreementPercent,
        disagreement_absolute_mm: comparison.disagreementAbsoluteMm,
        threshold_percent: comparison.thresholdPercent,
        passed: comparison.passed,
        notes: comparison.notes,
      })
      .select('*')
      .single()
    assertNoError(error, 'insert_climate_comparison')
    return mapComparisonRow(data as Record<string, unknown>)
  }

  const db = getDemoDatabase()
  db.climateComparisons.unshift(comparison)
  saveDemoDatabase(db)
  return comparison
}

// ----------------------------------------------------------------------------
// EVENTOS CLIMÁTICOS, INDEMNIZAÇÕES E EXCEPÇÕES OPERACIONAIS
// ----------------------------------------------------------------------------

export async function repoReviewClimateEvent(params: {
  eventId: string
  status: 'manual_review' | 'rejected' | 'trigger_activated'
  notes: string
}): Promise<{ previousStatus: EventStatus; event: ClimateEvent }> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data: existing, error: exErr } = await admin
      .from('climate_events')
      .select('*')
      .eq('id', params.eventId)
      .maybeSingle()
    assertNoError(exErr, 'get_event_for_review')
    if (!existing) {
      throw new RepositoryNotFoundError('Evento não encontrado.')
    }

    const previousStatus = existing.status as EventStatus
    const nextExplanation = `${existing.rule_applied_explanation} [Revisão técnica: ${params.notes}]`
    const nowIso = new Date().toISOString()

    const { error: upErr } = await admin
      .from('climate_events')
      .update({
        status: params.status,
        rule_applied_explanation: nextExplanation,
        updated_at: nowIso,
      })
      .eq('id', params.eventId)
    assertNoError(upErr, 'update_event_review')

    const state = await loadSupabaseFullState(admin)
    const updated = state.climateEvents.find((e) => e.id === params.eventId)
    if (!updated) throw new RepositoryNotFoundError('Evento não encontrado.')
    return { previousStatus, event: updated }
  }

  const db = getDemoDatabase()
  const event = db.climateEvents.find((e) => e.id === params.eventId)
  if (!event) throw new RepositoryNotFoundError('Evento não encontrado.')
  const previousStatus = event.status
  event.status = params.status
  event.ruleAppliedExplanation = `${event.ruleAppliedExplanation} [Revisão técnica: ${params.notes}]`
  event.updatedAt = new Date().toISOString()
  saveDemoDatabase(db)
  return { previousStatus, event }
}

export async function repoSaveStaffIndemnity(params: {
  indemnity: IndemnityCalculation
  newEventStatus: EventStatus
}): Promise<IndemnityCalculation> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data: indRow, error: indErr } = await admin
      .from('indemnity_calculations')
      .insert({
        event_id: params.indemnity.eventId,
        policy_id: params.indemnity.policyId,
        insured_capital_aoa: params.indemnity.insuredCapitalAoa,
        observed_precipitation_mm: params.indemnity.observedPrecipitationMm,
        contractual_threshold_mm: params.indemnity.contractualThresholdMm,
        deviation_percent: params.indemnity.deviationPercent,
        severity_label: params.indemnity.severityLabel,
        payout_percentage: params.indemnity.payoutPercentage,
        calculated_indemnity_aoa: params.indemnity.calculatedIndemnityAoa,
        capped_at_maximum: params.indemnity.cappedAtMaximum,
        explanation: params.indemnity.explanation,
        evidence_summary: params.indemnity.evidenceSummary,
      })
      .select('*')
      .single()
    if (indErr) {
      if (indErr.code === '23505') {
        throw new RepositoryConflictError(
          'Já existe cálculo de indemnização registado para este evento.'
        )
      }
      throw new Error(`[Supabase:insert_indemnity] ${indErr.message}`)
    }

    const { error: evErr } = await admin
      .from('climate_events')
      .update({
        status: params.newEventStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.indemnity.eventId)
    assertNoError(evErr, 'update_event_after_indemnity')

    return {
      ...params.indemnity,
      id: String(indRow.id),
      calculatedAt: String(indRow.calculated_at),
    }
  }

  const db = getDemoDatabase()
  const event = db.climateEvents.find((e) => e.id === params.indemnity.eventId)
  if (!event) throw new RepositoryNotFoundError('Evento não encontrado.')
  event.indemnityCalculationId = params.indemnity.id
  event.calculatedIndemnityAoa = params.indemnity.calculatedIndemnityAoa
  event.status = params.newEventStatus
  event.updatedAt = new Date().toISOString()
  db.indemnities.unshift(params.indemnity)
  saveDemoDatabase(db)
  return params.indemnity
}

/**
 * Resolve uma excepção operacional com garantia de concorrência e imutabilidade:
 * - Impede reabertura ou segunda decisão em excepções já encerradas (`approved` ou `rejected`),
 *   devolvendo erro de conflito (409).
 * - Em Supabase, executa a função SQL transaccional `resolve_operational_exception` com `FOR UPDATE`.
 */
export async function repoResolveOperationalException(params: {
  exceptionId: string
  decision: 'approve' | 'reject' | 'escalate'
  reason: string
  operatorUserId: string
  operatorFullName: string
  overrideObservedMm?: number
  indemnityCalculator: (args: {
    event: ClimateEvent
    policy: InsurancePolicy
    observedPrecipitationMm: number
  }) => IndemnityCalculation
}): Promise<{
  exception: OperationalException
  event: ClimateEvent
  previousExceptionStatus: string
  previousEventStatus: string
}> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const state = await loadSupabaseFullState(admin)
    const exception = state.exceptions.find((e) => e.id === params.exceptionId)
    if (!exception) {
      throw new RepositoryNotFoundError('Excepção operacional não encontrada.')
    }
    if (exception.status === 'approved' || exception.status === 'rejected') {
      throw new RepositoryConflictError(
        `Esta excepção já foi encerrada com o estado "${exception.status}" e não pode ser reaberta.`
      )
    }

    const event = state.climateEvents.find((e) => e.id === exception.eventId)
    const policy = state.policies.find((p) => p.id === exception.policyId)
    if (!event || !policy) {
      throw new RepositoryNotFoundError('Evento ou apólice associada não encontrada.')
    }

    let newExceptionStatus: OperationalException['status'] = 'escalated'
    let newEventStatus: EventStatus = 'manual_review'
    let newExplanation = `Incidente escalado por ${params.operatorFullName}: ${params.reason}`
    let observedForCalc: number | null = null
    let indemnity: IndemnityCalculation | null = null

    if (params.decision === 'approve') {
      observedForCalc = params.overrideObservedMm ?? event.observedPrecipitationMm
      if (observedForCalc === null) {
        throw new Error(
          'Indique a precipitação observada validada (overrideObservedMm) para aprovar um caso com dados inicialmente em falta.'
        )
      }
      indemnity = params.indemnityCalculator({
        event,
        policy,
        observedPrecipitationMm: observedForCalc,
      })
      newExceptionStatus = 'approved'
      newEventStatus =
        indemnity.calculatedIndemnityAoa > 0
          ? 'indemnity_calculated'
          : 'trigger_not_activated'
      newExplanation = `Caso excepcional aprovado manualmente por ${params.operatorFullName}: ${params.reason}`
    } else if (params.decision === 'reject') {
      newExceptionStatus = 'rejected'
      newEventStatus = 'rejected'
      newExplanation = `Caso excepcional rejeitado manualmente por ${params.operatorFullName}: ${params.reason}`
    }

    const { data: rpcRows, error: rpcErr } = await admin.rpc(
      'resolve_operational_exception',
      {
        p_exception_id: exception.id,
        p_operator_user_id: params.operatorUserId,
        p_decision: params.decision,
        p_reason: params.reason,
        p_new_exception_status: newExceptionStatus,
        p_new_event_status: newEventStatus,
        p_new_event_explanation: newExplanation,
        p_observed_precipitation_mm: observedForCalc,
        p_indemnity_observed_mm: indemnity?.observedPrecipitationMm ?? null,
        p_indemnity_threshold_mm: indemnity?.contractualThresholdMm ?? null,
        p_indemnity_deviation_percent: indemnity?.deviationPercent ?? null,
        p_indemnity_severity_label: indemnity?.severityLabel ?? null,
        p_indemnity_payout_percentage: indemnity?.payoutPercentage ?? null,
        p_indemnity_amount_aoa: indemnity?.calculatedIndemnityAoa ?? null,
        p_indemnity_capped: indemnity?.cappedAtMaximum ?? false,
        p_indemnity_explanation: indemnity?.explanation ?? null,
        p_indemnity_evidence: indemnity?.evidenceSummary ?? null,
        p_insured_capital_aoa: indemnity?.insuredCapitalAoa ?? null,
      }
    )

    if (rpcErr) {
      if (rpcErr.code === 'P0002' || rpcErr.message.includes('encerrada')) {
        throw new RepositoryConflictError(rpcErr.message)
      }
      throw new Error(`[Supabase:resolve_operational_exception] ${rpcErr.message}`)
    }

    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
    const customer = state.customers.find((c) => c.id === policy.customerId)

    if (params.decision === 'approve' && indemnity) {
      await admin.from('notifications').insert({
        user_id: customer?.userId ?? null,
        target_role: 'farmer',
        title: `Excepção aprovada — Apólice ${policy.policyNumber}`,
        message: `A equipa operacional validou as evidências climáticas. Indemnização apurada: ${indemnity.calculatedIndemnityAoa.toLocaleString('pt-AO')} AOA.`,
        category: 'exception',
        is_read: false,
        related_entity_type: 'climate_event',
        related_entity_id: event.id,
      })
    } else if (params.decision === 'escalate') {
      await admin.from('notifications').insert({
        user_id: null,
        target_role: 'manager',
        title: `Incidente escalado — ${policy.policyNumber}`,
        message: `Operador escalou excepção para decisão da gestão: ${params.reason}`,
        category: 'exception',
        is_read: false,
        related_entity_type: 'exception',
        related_entity_id: exception.id,
      })
    }

    const refreshed = await loadSupabaseFullState(admin)
    return {
      exception: refreshed.exceptions.find((e) => e.id === exception.id)!,
      event: refreshed.climateEvents.find((e) => e.id === event.id)!,
      previousExceptionStatus: String(
        row?.previous_exception_status || exception.status
      ),
      previousEventStatus: String(row?.previous_event_status || event.status),
    }
  }

  // Caminho Demonstração (também com bloqueio estrito de reabertura)
  const db = getDemoDatabase()
  const exception = db.exceptions.find((e) => e.id === params.exceptionId)
  if (!exception) {
    throw new RepositoryNotFoundError('Excepção operacional não encontrada.')
  }
  if (exception.status === 'approved' || exception.status === 'rejected') {
    throw new RepositoryConflictError(
      `Esta excepção já foi encerrada com o estado "${exception.status}" e não pode ser reaberta.`
    )
  }

  const event = db.climateEvents.find((e) => e.id === exception.eventId)
  const policy = db.policies.find((p) => p.id === exception.policyId)
  if (!event || !policy) {
    throw new RepositoryNotFoundError('Evento ou apólice associada não encontrada.')
  }

  const nowIso = new Date().toISOString()
  const prevExceptionStatus = exception.status
  const prevEventStatus = event.status

  if (params.decision === 'approve') {
    const observedForCalc =
      params.overrideObservedMm ?? event.observedPrecipitationMm
    if (observedForCalc === null) {
      throw new Error(
        'Indique a precipitação observada validada (overrideObservedMm) para aprovar um caso com dados inicialmente em falta.'
      )
    }

    exception.status = 'approved'
    exception.assignedOperatorId = params.operatorUserId
    exception.decisionReason = params.reason
    exception.resolvedAt = nowIso

    event.observedPrecipitationMm = observedForCalc
    const indemnity = params.indemnityCalculator({
      event,
      policy,
      observedPrecipitationMm: observedForCalc,
    })

    if (!event.indemnityCalculationId) {
      db.indemnities.unshift(indemnity)
      event.indemnityCalculationId = indemnity.id
    }
    event.calculatedIndemnityAoa = indemnity.calculatedIndemnityAoa
    event.status =
      indemnity.calculatedIndemnityAoa > 0
        ? 'indemnity_calculated'
        : 'trigger_not_activated'
    event.ruleAppliedExplanation = `Caso excepcional aprovado manualmente por ${params.operatorFullName}: ${params.reason}`
    event.updatedAt = nowIso

    const customer = db.customers.find((c) => c.id === policy.customerId)
    db.notifications.unshift({
      id: generateId('notif'),
      userId: customer?.userId ?? null,
      targetRole: 'farmer',
      title: `Excepção aprovada — Apólice ${policy.policyNumber}`,
      message: `A equipa operacional validou as evidências climáticas. Indemnização apurada: ${indemnity.calculatedIndemnityAoa.toLocaleString('pt-AO')} AOA.`,
      category: 'exception',
      read: false,
      relatedEntityType: 'climate_event',
      relatedEntityId: event.id,
      createdAt: nowIso,
    })
  } else if (params.decision === 'reject') {
    exception.status = 'rejected'
    exception.assignedOperatorId = params.operatorUserId
    exception.decisionReason = params.reason
    exception.resolvedAt = nowIso

    event.status = 'rejected'
    event.calculatedIndemnityAoa = 0
    event.ruleAppliedExplanation = `Caso excepcional rejeitado manualmente por ${params.operatorFullName}: ${params.reason}`
    event.updatedAt = nowIso
  } else {
    exception.status = 'escalated'
    exception.assignedOperatorId = params.operatorUserId
    exception.decisionReason = params.reason
    exception.resolvedAt = null

    event.status = 'manual_review'
    event.ruleAppliedExplanation = `Incidente escalado por ${params.operatorFullName}: ${params.reason}`
    event.updatedAt = nowIso

    db.notifications.unshift({
      id: generateId('notif'),
      userId: null,
      targetRole: 'manager',
      title: `Incidente escalado — ${policy.policyNumber}`,
      message: `Operador escalou excepção para decisão da gestão: ${params.reason}`,
      category: 'exception',
      read: false,
      relatedEntityType: 'exception',
      relatedEntityId: exception.id,
      createdAt: nowIso,
    })
  }

  saveDemoDatabase(db)
  return {
    exception,
    event,
    previousExceptionStatus: prevExceptionStatus,
    previousEventStatus: prevEventStatus,
  }
}

// ----------------------------------------------------------------------------
// NOTIFICAÇÕES
// ----------------------------------------------------------------------------

export async function repoListNotifications(scope: {
  userId: string
  role: UserRole
}): Promise<PlatformNotification[]> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(120)
    assertNoError(error, 'list_notifications')
    return (data || [])
      .map(mapNotificationRow)
      .filter(
        (n) =>
          n.userId === scope.userId ||
          (n.userId === null && n.targetRole === scope.role) ||
          scope.role === 'manager'
      )
  }

  const db = getDemoDatabase()
  return db.notifications.filter(
    (n) =>
      n.userId === scope.userId ||
      (n.userId === null && n.targetRole === scope.role) ||
      scope.role === 'manager'
  )
}

export async function repoMarkNotificationsRead(
  scope: { userId: string; role: UserRole },
  notificationId?: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()
    const items = await repoListNotifications(scope)
    const idsToMark = items
      .filter((n) => !n.read && (!notificationId || n.id === notificationId))
      .map((n) => n.id)
    if (idsToMark.length > 0) {
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .in('id', idsToMark)
      assertNoError(error, 'mark_notifications_read')
    }
    return
  }

  const db = getDemoDatabase()
  for (const n of db.notifications) {
    const belongs =
      n.userId === scope.userId ||
      (n.userId === null && n.targetRole === scope.role) ||
      scope.role === 'manager'
    if (belongs && (!notificationId || n.id === notificationId)) {
      n.read = true
    }
  }
  saveDemoDatabase(db)
}

export function generateServerUuid(): string {
  return crypto.randomUUID()
}
