import Decimal from 'decimal.js'
import { ANGOLA_PROVINCES } from '@/config/angola'
import type {
  AgriculturalCampaign,
  CropType,
  InsuranceProduct,
  PremiumBreakdown,
} from '@/types/domain'

export interface PremiumCalculationInput {
  insuredCapitalAoa: number
  province: string
  crop: CropType
  campaign: AgriculturalCampaign
  product: InsuranceProduct
}

/**
 * Calcula o prémio de seguro agrícola paramétrico utilizando aritmética financeira precisa (Decimal.js).
 *
 * O cálculo decorre exclusivamente no servidor para impedir manipulação de taxas no cliente
 * e utiliza premissas actuariais configuráveis por província, cultura, tipo de cobertura e campanha.
 *
 * Nota técnica: Para o MVP, estas premissas representam factores actuariais configuráveis pela equipa
 * técnica da NOSSA Seguros, não constituindo uma tábua actuarial definitiva homologada.
 *
 * @param input Dados da propriedade, cultura, campanha, produto e capital segurado em AOA.
 * @returns Detalhamento completo do cálculo do prémio e da indemnização máxima.
 */
export function calculateParametricPremium(
  input: PremiumCalculationInput
): PremiumBreakdown {
  const capital = new Decimal(input.insuredCapitalAoa)
  const baseRate = new Decimal(input.product.basePremiumRate)

  const provinceConfig = ANGOLA_PROVINCES.find(
    (p) => p.name.toLowerCase() === input.province.toLowerCase()
  )
  const provinceMultiplier = new Decimal(
    provinceConfig ? provinceConfig.climateRiskMultiplier : 1.1
  )
  const cropMultiplier = new Decimal(input.crop.riskMultiplier)
  const campaignMultiplier = new Decimal(input.campaign.riskMultiplier)
  const coverageMultiplier = new Decimal(
    input.product.coverageType === 'drought' ? 1.0 : 0.96
  )

  const effectiveRate = baseRate
    .times(provinceMultiplier)
    .times(cropMultiplier)
    .times(campaignMultiplier)
    .times(coverageMultiplier)

  const rawCalculatedPremium = capital
    .times(effectiveRate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  const minPremium = new Decimal(input.product.minPremiumAoa)
  const minimumPremiumApplied = rawCalculatedPremium.lt(minPremium)
  const finalPremium = minimumPremiumApplied ? minPremium : rawCalculatedPremium

  // A indemnização máxima é limitada ao capital segurado e ao maior percentual das faixas de severidade
  const maxBandPercent = input.product.severityBands.reduce(
    (max, band) => Math.max(max, band.payoutPercentage),
    0
  )
  const maximumIndemnity = capital
    .times(new Decimal(maxBandPercent).div(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  return {
    insuredCapitalAoa: capital.toNumber(),
    baseRate: baseRate.toNumber(),
    provinceMultiplier: provinceMultiplier.toNumber(),
    cropMultiplier: cropMultiplier.toNumber(),
    coverageMultiplier: coverageMultiplier.toNumber(),
    campaignMultiplier: campaignMultiplier.toNumber(),
    effectiveRate: effectiveRate.toDecimalPlaces(6).toNumber(),
    calculatedPremiumAoa: rawCalculatedPremium.toNumber(),
    minimumPremiumApplied,
    finalPremiumAoa: finalPremium.toNumber(),
    maximumIndemnityAoa: maximumIndemnity.toNumber(),
    assumptionsNote:
      'Premissas actuariais configuráveis para o MVP (taxa base × factor provincial × factor da cultura × factor da campanha × factor de cobertura). Sujeito a revisão técnica pela Direcção Actuarial da NOSSA Seguros.',
  }
}
