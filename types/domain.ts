/**
 * Tipos de domínio partilhados em toda a plataforma NOSSA AgroParamétrico.
 * Alinhados diretamente com o esquema normalizado da base de dados PostgreSQL/Supabase.
 */

export type UserRole = 'farmer' | 'manager' | 'operator'

export type CoverageType = 'drought' | 'excess_rain'

export type PolicyStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'cancelled'

export type EventStatus =
  | 'monitoring'
  | 'potential_event'
  | 'data_validation_pending'
  | 'trigger_activated'
  | 'trigger_not_activated'
  | 'manual_review'
  | 'indemnity_calculated'
  | 'payment_pending'
  | 'paid'
  | 'rejected'
  | 'exception'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'

export type PaymentKind = 'premium' | 'indemnity'

export type ClimateDataQualityStatus =
  | 'valid'
  | 'insufficient'
  | 'invalid_values'
  | 'delayed'
  | 'source_disagreement'
  | 'duplicate_detected'

export type ExceptionStatus = 'open' | 'under_review' | 'approved' | 'rejected' | 'escalated'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  phone: string
  nif: string
  province: string
  municipality: string
  role: UserRole
  createdAt: string
}

export interface CustomerRecord {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  nif: string
  province: string
  municipality: string
  farmerCategory: 'smallholder' | 'medium_producer' | 'cooperative'
  kycStatus: 'verified' | 'pending'
  createdAt: string
}

export interface CropType {
  id: string
  code: string
  name: string
  scientificName: string
  riskMultiplier: number
  optimalRainfallMinMm: number
  optimalRainfallMaxMm: number
  cycleDays: number
}

export interface AgriculturalCampaign {
  id: string
  code: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'closed'
  riskMultiplier: number
}

export interface FarmProperty {
  id: string
  customerId: string
  name: string
  province: string
  municipality: string
  commune: string
  latitude: number
  longitude: number
  areaHectares: number
  primaryCropId: string
  primaryCropName: string
  soilType: string
  irrigationType: 'rainfed' | 'partial_irrigation'
  createdAt: string
}

export interface SeverityBand {
  id: string
  label: string
  /** Percentagem mínima de desvio em relação ao gatilho contratual (ex: 0, 15, 30, 50) */
  minDeviationPercent: number
  /** Percentagem máxima de desvio (null = sem limite superior) */
  maxDeviationPercent: number | null
  /** Percentagem do capital segurado paga nesta faixa (0 a 100) */
  payoutPercentage: number
}

export interface InsuranceProduct {
  id: string
  code: string
  name: string
  description: string
  coverageType: CoverageType
  activeVersionId: string
  activeVersionNumber: number
  status: 'active' | 'inactive'
  supportedCropIds: string[]
  supportedProvinces: string[]
  minCapitalAoa: number
  maxCapitalAoa: number
  basePremiumRate: number
  minPremiumAoa: number
  /** Gatilho contratual de precipitação acumulada em mm para o período de cobertura */
  triggerThresholdMm: number
  /** Duração da janela de observação em dias */
  observationWindowDays: number
  /** Limiar máximo de discordância entre fontes climáticas (%) */
  maxSourceDisagreementPercent: number
  /** Cobertura mínima de observações válidas exigida (%) */
  minDataCompletenessPercent: number
  severityBands: SeverityBand[]
  createdAt: string
  updatedAt: string
}

export interface PremiumBreakdown {
  insuredCapitalAoa: number
  baseRate: number
  provinceMultiplier: number
  cropMultiplier: number
  coverageMultiplier: number
  campaignMultiplier: number
  effectiveRate: number
  calculatedPremiumAoa: number
  minimumPremiumApplied: boolean
  finalPremiumAoa: number
  maximumIndemnityAoa: number
  assumptionsNote: string
}

export interface InsuranceSimulation {
  id: string
  customerId: string
  farmId: string
  farmName: string
  province: string
  cropId: string
  cropName: string
  campaignId: string
  campaignName: string
  productId: string
  productVersionId: string
  productName: string
  coverageType: CoverageType
  insuredCapitalAoa: number
  estimatedPremiumAoa: number
  triggerThresholdMm: number
  observationWindowDays: number
  maxPossibleIndemnityAoa: number
  breakdown: PremiumBreakdown
  createdAt: string
}

export interface PolicyContractTerms {
  productVersionId: string
  productVersionNumber: number
  coverageType: CoverageType
  climateIndicator: string
  triggerThresholdMm: number
  observationWindowDays: number
  minDataCompletenessPercent: number
  maxSourceDisagreementPercent: number
  severityBands: SeverityBand[]
  termsAcceptedAt: string
  termsVersion: string
  isSimulatedDemonstration: boolean
}

export interface InsurancePolicy {
  id: string
  policyNumber: string
  simulationId: string
  customerId: string
  customerName: string
  farmId: string
  farmName: string
  province: string
  municipality: string
  latitude: number
  longitude: number
  cropId: string
  cropName: string
  campaignId: string
  campaignName: string
  productId: string
  productName: string
  insuredCapitalAoa: number
  premiumAoa: number
  startDate: string
  endDate: string
  status: PolicyStatus
  contractTerms: PolicyContractTerms
  issuedAt: string | null
  createdAt: string
}

export interface ClimateProviderConfig {
  id: string
  code: 'open_meteo_era5' | 'nasa_power' | 'chirps' | 'inamet' | 'ggpen' | 'copernicus'
  name: string
  role: 'primary' | 'confirmation' | 'planned'
  status: 'active' | 'planned' | 'degraded'
  endpointUrl: string
  spatialResolution: string
  temporalResolution: string
  isLiveExternal: boolean
  description: string
}

export interface ClimateObservation {
  id: string
  providerCode: ClimateProviderConfig['code']
  providerName: string
  latitude: number
  longitude: number
  observationDate: string
  precipitationMm: number | null
  unit: 'mm'
  retrievedAt: string
  sourceUrl: string
  spatialResolution: string
  qualityStatus: ClimateDataQualityStatus
  isSimulatedData: boolean
  rawPayloadReference: string
  validationNotes: string[]
}

export interface ClimateSourceComparison {
  id: string
  farmId: string
  policyId: string | null
  windowStart: string
  windowEnd: string
  primaryProvider: string
  secondaryProvider: string
  primaryAccumulatedMm: number | null
  secondaryAccumulatedMm: number | null
  disagreementPercent: number | null
  disagreementAbsoluteMm: number | null
  thresholdPercent: number
  passed: boolean
  notes: string
  createdAt: string
}

export interface IndemnityCalculation {
  id: string
  eventId: string
  policyId: string
  policyNumber: string
  insuredCapitalAoa: number
  observedPrecipitationMm: number
  contractualThresholdMm: number
  deviationPercent: number
  severityLabel: string
  payoutPercentage: number
  calculatedIndemnityAoa: number
  cappedAtMaximum: boolean
  explanation: string
  evidenceSummary: string
  calculatedAt: string
}

export interface ClimateEvent {
  id: string
  /** Chave determinística para prevenção de eventos duplicados */
  eventKey: string
  policyId: string
  policyNumber: string
  customerId: string
  customerName: string
  farmId: string
  farmName: string
  province: string
  coverageType: CoverageType
  windowStart: string
  windowEnd: string
  observedPrecipitationMm: number | null
  contractualThresholdMm: number
  dataQualityStatus: ClimateDataQualityStatus
  comparisonId: string | null
  status: EventStatus
  ruleAppliedExplanation: string
  indemnityCalculationId: string | null
  calculatedIndemnityAoa: number | null
  evidenceSummary: string
  isSimulatedScenario: boolean
  detectedAt: string
  updatedAt: string
}

export interface OperationalException {
  id: string
  eventId: string
  policyId: string
  policyNumber: string
  farmName: string
  reasonCode:
    | 'insufficient_data'
    | 'source_disagreement'
    | 'duplicate_attempt'
    | 'delayed_data'
    | 'invalid_values'
  severity: 'medium' | 'high' | 'critical'
  description: string
  status: ExceptionStatus
  assignedOperatorId: string | null
  decisionReason: string | null
  previousEventStatus: EventStatus
  resolvedAt: string | null
  createdAt: string
}

export interface PaymentRecord {
  id: string
  /** Chave de idempotência para impedir cobranças ou indemnizações duplicadas */
  idempotencyKey: string
  transactionReference: string
  kind: PaymentKind
  customerId: string
  customerName: string
  policyId: string
  policyNumber: string
  eventId: string | null
  amountAoa: number
  channel: 'multicaixa_express_sim' | 'bai_directo_sim' | 'unitel_money_sim'
  status: PaymentStatus
  failureReason: string | null
  isSimulated: true
  createdAt: string
  processedAt: string | null
}

export interface PlatformNotification {
  id: string
  userId: string | null
  targetRole: UserRole | null
  title: string
  message: string
  category: 'policy' | 'climate' | 'payment' | 'exception' | 'system'
  read: boolean
  relatedEntityType: string | null
  relatedEntityId: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  userRole: UserRole | 'system'
  action: string
  entityType: string
  entityId: string
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  result: 'success' | 'failure' | 'blocked'
  timestamp: string
}

export interface SystemSettings {
  defaultDisagreementThresholdPercent: number
  defaultMinCompletenessPercent: number
  autoIndemnityEnabled: boolean
  demonstrationModeActive: boolean
  primaryClimateProvider: ClimateProviderConfig['code']
  confirmationClimateProvider: ClimateProviderConfig['code']
  updatedAt: string
}
