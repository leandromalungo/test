import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { farmSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoCreateFarm,
  repoListFarms,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/farms
 * Lista propriedades agrícolas. Agricultores vêem apenas as suas; gestores e operadores vêem todas.
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const farms = await repoListFarms({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
  })

  return NextResponse.json({ farms }, { headers: NO_STORE_SECURITY_HEADERS })
}

/**
 * POST /api/farms
 * Regista uma nova propriedade agrícola associada ao agricultor autenticado.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  try {
    const body: unknown = await req.json()
    const parsed = farmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Dados da propriedade inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const customerId = auth.context.customer?.id
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            'Apenas contas de agricultor associadas a um cliente podem registar propriedades.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const newFarm = await repoCreateFarm({
      customerId,
      name: parsed.data.name,
      province: parsed.data.province,
      municipality: parsed.data.municipality,
      commune: parsed.data.commune,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      areaHectares: parsed.data.areaHectares,
      primaryCropId: parsed.data.primaryCropId,
      soilType: parsed.data.soilType,
      irrigationType: parsed.data.irrigationType,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'FARM_REGISTERED',
      entityType: 'farm',
      entityId: newFarm.id,
      newState: {
        name: newFarm.name,
        province: newFarm.province,
        latitude: newFarm.latitude,
        longitude: newFarm.longitude,
        areaHectares: newFarm.areaHectares,
      },
      result: 'success',
    })

    return NextResponse.json(
      { farm: newFarm },
      { status: 201, headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao registar propriedade agrícola.',
      },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
