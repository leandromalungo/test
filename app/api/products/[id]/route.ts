import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { productUpdateSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoGetProductById,
  repoUpdateProductVersion,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/products/[id]
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const product = await repoGetProductById(id)
  if (!product) {
    return NextResponse.json(
      { error: 'Produto não encontrado.' },
      { status: 404 }
    )
  }
  return NextResponse.json({ product })
}

/**
 * PATCH /api/products/[id]
 * Actualiza regras do produto gerando uma nova versão (`activeVersionNumber + 1`),
 * preservando intactas todas as apólices anteriormente subscritas.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const body: unknown = await req.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Parâmetros de actualização inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const { previousState, product } = await repoUpdateProductVersion(
      id,
      parsed.data
    )

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'PRODUCT_VERSION_UPDATED',
      entityType: 'insurance_product',
      entityId: product.id,
      previousState,
      newState: {
        version: product.activeVersionNumber,
        triggerThresholdMm: product.triggerThresholdMm,
        basePremiumRate: product.basePremiumRate,
        observationWindowDays: product.observationWindowDays,
      },
      metadata: {
        note: 'Apólices existentes mantêm os termos da versão original.',
      },
      result: 'success',
    })

    return NextResponse.json({ product }, { headers: NO_STORE_SECURITY_HEADERS })
  } catch (err) {
    if (err instanceof RepositoryNotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao actualizar versão do produto.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
