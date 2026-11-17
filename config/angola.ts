/**
 * Configurações geográficas e climáticas de referência para o mercado angolano.
 * Inclui coordenadas representativas das principais províncias agrícolas,
 * multiplicadores de risco configuráveis para o MVP e utilitários de formatação em AOA.
 */

export interface AngolaProvinceConfig {
  code: string
  name: string
  municipalityExample: string
  latitude: number
  longitude: number
  /** Multiplicador base de risco climático para o modelo atuarial configurável do MVP */
  climateRiskMultiplier: number
  /** Região agroecológica principal */
  agroZone: string
  /** Precipitação média histórica na campanha (mm) */
  historicalCampaignRainfallMm: number
}

export const ANGOLA_PROVINCES: AngolaProvinceConfig[] = [
  {
    code: 'HUA',
    name: 'Huambo',
    municipalityExample: 'Caála',
    latitude: -12.8525,
    longitude: 15.5606,
    climateRiskMultiplier: 1.05,
    agroZone: 'Planalto Central',
    historicalCampaignRainfallMm: 1120,
  },
  {
    code: 'HUI',
    name: 'Huíla',
    municipalityExample: 'Lubango / Chibia',
    latitude: -14.9172,
    longitude: 13.4925,
    climateRiskMultiplier: 1.18,
    agroZone: 'Planalto da Huíla e Semiárido Sul',
    historicalCampaignRainfallMm: 820,
  },
  {
    code: 'BGU',
    name: 'Benguela',
    municipalityExample: 'Cubal / Ganda',
    latitude: -13.0333,
    longitude: 14.25,
    climateRiskMultiplier: 1.15,
    agroZone: 'Litoral Centro e Subplanalto',
    historicalCampaignRainfallMm: 690,
  },
  {
    code: 'CSU',
    name: 'Cuanza Sul',
    municipalityExample: 'Waku-Kungo',
    latitude: -11.3583,
    longitude: 15.1194,
    climateRiskMultiplier: 1.02,
    agroZone: 'Planalto de Cela',
    historicalCampaignRainfallMm: 1180,
  },
  {
    code: 'BIE',
    name: 'Bié',
    municipalityExample: 'Kuito',
    latitude: -12.3833,
    longitude: 16.9333,
    climateRiskMultiplier: 1.04,
    agroZone: 'Planalto Central Oriental',
    historicalCampaignRainfallMm: 1210,
  },
  {
    code: 'UIG',
    name: 'Uíge',
    municipalityExample: 'Negage',
    latitude: -7.75,
    longitude: 15.2667,
    climateRiskMultiplier: 1.08,
    agroZone: 'Norte Húmido',
    historicalCampaignRainfallMm: 1450,
  },
  {
    code: 'MAL',
    name: 'Malanje',
    municipalityExample: 'Cacuso',
    latitude: -9.4333,
    longitude: 15.75,
    climateRiskMultiplier: 1.06,
    agroZone: 'Norte Sub-húmido',
    historicalCampaignRainfallMm: 1150,
  },
  {
    code: 'CUN',
    name: 'Cunene',
    municipalityExample: 'Ondjiva / Cahama',
    latitude: -17.0667,
    longitude: 15.7333,
    climateRiskMultiplier: 1.35,
    agroZone: 'Semiárido Sul (Elevado Risco de Seca)',
    historicalCampaignRainfallMm: 460,
  },
  {
    code: 'LUA',
    name: 'Luanda',
    municipalityExample: 'Icolo e Bengo',
    latitude: -9.1167,
    longitude: 13.7333,
    climateRiskMultiplier: 1.12,
    agroZone: 'Bacia do Bengo',
    historicalCampaignRainfallMm: 540,
  },
  {
    code: 'MOX',
    name: 'Moxico',
    municipalityExample: 'Luena',
    latitude: -11.7833,
    longitude: 19.9167,
    climateRiskMultiplier: 1.07,
    agroZone: 'Leste Savânico',
    historicalCampaignRainfallMm: 1240,
  },
]

/**
 * Caixa delimitadora geográfica aproximada de Angola para validação de coordenadas.
 * Previne registos de propriedades fora do território coberto pelos produtos.
 */
export const ANGOLA_BOUNDS = {
  minLatitude: -18.2,
  maxLatitude: -4.2,
  minLongitude: 11.4,
  maxLongitude: 24.2,
}

/**
 * Formata valores monetários em Kwanzas Angolanos (AOA) com separação tabular consistente.
 */
export function formatAOA(amount: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formata valores de precipitação em milímetros.
 */
export function formatMm(mm: number | null | undefined): string {
  if (mm === null || mm === undefined || Number.isNaN(mm)) {
    return 'Sem dado'
  }
  return `${mm.toFixed(1)} mm`
}
