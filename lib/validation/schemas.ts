import { z } from 'zod'
import { ANGOLA_BOUNDS } from '@/config/angola'

/**
 * Esquemas de validação Zod centralizados.
 * Todos os Route Handlers da API e formulários do frontend validam entradas através destes esquemas.
 */

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Nome completo deve ter pelo menos 3 caracteres').max(120),
    email: z.string().trim().email('Endereço de e-mail inválido').max(254),
    password: z
      .string()
      .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
      .max(128, 'A palavra-passe excede o limite máximo permitido'),
    phone: z.string().trim().min(9, 'Número de telefone inválido').max(20),
    nif: z.string().trim().min(9, 'NIF angolano deve ter pelo menos 9 caracteres').max(20),
    province: z.string().trim().min(2, 'Selecione a província'),
    municipality: z.string().trim().min(2, 'Indique o município'),
    farmerCategory: z.enum(['smallholder', 'medium_producer', 'cooperative']).default('smallholder'),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Introduza um endereço de e-mail válido')
      .max(254, 'Endereço de e-mail demasiado longo'),
    password: z
      .string()
      .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
      .max(128, 'A palavra-passe excede o limite máximo permitido'),
  })
  .strict()

export const profileUpdateSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  phone: z.string().min(9).max(20).optional(),
  province: z.string().min(2).optional(),
  municipality: z.string().min(2).optional(),
})

export const farmSchema = z.object({
  name: z.string().min(3, 'Nome da propriedade obrigatório').max(120),
  province: z.string().min(2, 'Província obrigatória'),
  municipality: z.string().min(2, 'Município obrigatório'),
  commune: z.string().min(2, 'Comuna ou localidade obrigatória'),
  latitude: z
    .number()
    .min(ANGOLA_BOUNDS.minLatitude, 'Latitude fora do território angolano')
    .max(ANGOLA_BOUNDS.maxLatitude, 'Latitude fora do território angolano'),
  longitude: z
    .number()
    .min(ANGOLA_BOUNDS.minLongitude, 'Longitude fora do território angolano')
    .max(ANGOLA_BOUNDS.maxLongitude, 'Longitude fora do território angolano'),
  areaHectares: z.number().positive('Área deve ser superior a 0 ha').max(50000),
  primaryCropId: z.string().min(1, 'Selecione a cultura principal'),
  soilType: z.string().min(2, 'Indique o tipo de solo').default('Franco-argiloso'),
  irrigationType: z.enum(['rainfed', 'partial_irrigation']).default('rainfed'),
})

export const severityBandSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2),
  minDeviationPercent: z.number().min(0).max(100),
  maxDeviationPercent: z.number().min(0).max(1000).nullable(),
  payoutPercentage: z.number().min(0).max(100),
})

export const productCreateSchema = z.object({
  code: z.string().min(3).max(40),
  name: z.string().min(4).max(120),
  description: z.string().min(10).max(600),
  coverageType: z.enum(['drought', 'excess_rain']),
  supportedCropIds: z.array(z.string()).min(1, 'Selecione pelo menos uma cultura'),
  supportedProvinces: z.array(z.string()).min(1, 'Selecione pelo menos uma província'),
  minCapitalAoa: z.number().positive(),
  maxCapitalAoa: z.number().positive(),
  basePremiumRate: z.number().min(0.005).max(0.5),
  minPremiumAoa: z.number().positive(),
  triggerThresholdMm: z.number().positive(),
  observationWindowDays: z.number().int().min(7).max(365),
  maxSourceDisagreementPercent: z.number().min(5).max(80),
  minDataCompletenessPercent: z.number().min(50).max(100),
  severityBands: z.array(severityBandSchema).min(2),
})

export const productUpdateSchema = productCreateSchema.partial()

export const simulationCreateSchema = z.object({
  farmId: z.string().min(1, 'Selecione a propriedade agrícola'),
  cropId: z.string().min(1, 'Selecione a cultura'),
  campaignId: z.string().min(1, 'Selecione a campanha agrícola'),
  productId: z.string().min(1, 'Selecione o produto de seguro'),
  insuredCapitalAoa: z.number().positive('O capital segurado deve ser positivo'),
})

export const policyCreateSchema = z.object({
  simulationId: z.string().min(1, 'ID da simulação obrigatório'),
  termsAccepted: z.literal(true, {
    error: 'É obrigatório aceitar as condições contratuais',
  }),
  startDate: z.string().optional(),
})

export const climateFetchSchema = z.object({
  farmId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)'),
  provider: z.enum(['open_meteo_era5', 'nasa_power']).default('open_meteo_era5'),
  mode: z.enum(['live', 'demo_drought', 'demo_excess', 'demo_insufficient', 'demo_disagreement']).default('live'),
})

export const climateCompareSchema = z.object({
  farmId: z.string().min(1),
  policyId: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  disagreementThresholdPercent: z.number().min(5).max(100).optional(),
  mode: z.enum(['live', 'demo_disagreement']).default('live'),
})

export const monitoringRunSchema = z.object({
  policyId: z.string().optional(),
  scenario: z
    .enum([
      'live_or_stored',
      'normal_no_trigger',
      'drought_trigger',
      'excess_rain_trigger',
      'insufficient_data',
      'source_disagreement',
    ])
    .default('live_or_stored'),
})

export const paymentSimulateSchema = z.object({
  kind: z.enum(['premium', 'indemnity']),
  policyId: z.string().min(1),
  eventId: z.string().nullable().optional(),
  channel: z
    .enum(['multicaixa_express_sim', 'bai_directo_sim', 'unitel_money_sim'])
    .default('multicaixa_express_sim'),
  simulateOutcome: z.enum(['successful', 'failed']).default('successful'),
  idempotencyKey: z.string().min(6),
})

export const operatorDecisionSchema = z.object({
  exceptionId: z.string().min(1),
  decision: z.enum(['approve', 'reject', 'escalate']),
  reason: z.string().min(10, 'Registe uma justificação detalhada (mínimo 10 caracteres)').max(500),
  overrideObservedMm: z.number().min(0).optional(),
})

export const settingsUpdateSchema = z.object({
  defaultDisagreementThresholdPercent: z.number().min(5).max(80).optional(),
  defaultMinCompletenessPercent: z.number().min(50).max(100).optional(),
  autoIndemnityEnabled: z.boolean().optional(),
})
