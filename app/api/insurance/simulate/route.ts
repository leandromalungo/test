import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { simulationCreateSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  loadPlatformState,
  repoSaveSimulation,
} from '@/lib/repositories/platform-repository'
import { calculateParametricPremium } from '@/services/premium/premium-engine'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * POST /api/insurance/simulate
 * Executa simulação de seguro paramétrico no servidor utilizando configurações actuariais
 * da base de dados e calcula o prémio com Decimal.js.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  const rate = await checkRateLimitDistributed(
    `simulate:${auth.context.user.id}`,
    30,
    60_000
  )
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Limite de simulações atingido. Aguarde 1 minuto.' },
      { status: 429, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = simulationCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Parâmetros de simulação inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const state = await loadPlatformState({
      role: auth.context.user.role,
      customerId: auth.context.customer?.id ?? null,
      userId: auth.context.user.id,
    })

    const farm = state.farms.find((f) => f.id === parsed.data.farmId)
    if (!farm) {
      return NextResponse.json(
        { error: 'Propriedade agrícola não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      auth.context.user.role === 'farmer' &&
      farm.customerId !== auth.context.customer?.id
    ) {
      return NextResponse.json(
        {
          error:
            'Não tem permissão para simular cobertura para esta propriedade.',
        },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const crop = state.crops.find((c) => c.id === parsed.data.cropId)
    const campaign = state.campaigns.find(
      (c) => c.id === parsed.data.campaignId
    )
    const product = state.products.find((p) => p.id === parsed.data.productId)

    if (!crop || !campaign || !product) {
      return NextResponse.json(
        { error: 'Cultura, campanha ou produto inválido.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (product.status !== 'active') {
      return NextResponse.json(
        { error: 'Este produto de seguro encontra-se inactivo.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (!product.supportedCropIds.includes(crop.id)) {
      return NextResponse.json(
        {
          error: `O produto "${product.name}" não cobre a cultura ${crop.name}.`,
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (!product.supportedProvinces.includes(farm.province)) {
      return NextResponse.json(
        {
          error: `O produto "${product.name}" não possui cobertura geográfica configurada para a província de ${farm.province}.`,
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      parsed.data.insuredCapitalAoa < product.minCapitalAoa ||
      parsed.data.insuredCapitalAoa > product.maxCapitalAoa
    ) {
      return NextResponse.json(
        {
          error: `O capital segurado deve situar-se entre ${product.minCapitalAoa.toLocaleString('pt-AO')} AOA e ${product.maxCapitalAoa.toLocaleString('pt-AO')} AOA.`,
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const breakdown = calculateParametricPremium({
      insuredCapitalAoa: parsed.data.insuredCapitalAoa,
      province: farm.province,
      crop,
      campaign,
      product,
    })

    const simulation = await repoSaveSimulation({
      customerId: farm.customerId,
      farmId: farm.id,
      farmName: farm.name,
      province: farm.province,
      cropId: crop.id,
      cropName: crop.name,
      campaignId: campaign.id,
      campaignName: campaign.name,
      productId: product.id,
      productVersionId: product.activeVersionId,
      productName: product.name,
      coverageType: product.coverageType,
      insuredCapitalAoa: parsed.data.insuredCapitalAoa,
      estimatedPremiumAoa: breakdown.finalPremiumAoa,
      triggerThresholdMm: product.triggerThresholdMm,
      observationWindowDays: product.observationWindowDays,
      maxPossibleIndemnityAoa: breakdown.maximumIndemnityAoa,
      breakdown,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'PREMIUM_SIMULATED',
      entityType: 'insurance_simulation',
      entityId: simulation.id,
      newState: {
        productCode: product.code,
        insuredCapitalAoa: simulation.insuredCapitalAoa,
        estimatedPremiumAoa: simulation.estimatedPremiumAoa,
        province: farm.province,
      },
      result: 'success',
    })

    return NextResponse.json(
      { simulation },
      { status: 201, headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao executar simulação paramétrica.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
