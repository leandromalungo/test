import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { productCreateSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoCreateProduct,
  repoListProducts,
  RepositoryConflictError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/products
 * Lista os produtos de seguro paramétrico configurados.
 */
export async function GET() {
  const products = await repoListProducts()
  return NextResponse.json({ products })
}

/**
 * POST /api/products
 * Cria um novo produto de seguro paramétrico versionado (exclusivo para Gestor NOSSA Seguros).
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager'])
  if (!auth.ok) return auth.response

  try {
    const body: unknown = await req.json()
    const parsed = productCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            'Configuração de produto inválida.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const product = await repoCreateProduct(parsed.data)

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'PRODUCT_CREATED',
      entityType: 'insurance_product',
      entityId: product.id,
      newState: {
        code: product.code,
        name: product.name,
        triggerThresholdMm: product.triggerThresholdMm,
        basePremiumRate: product.basePremiumRate,
      },
      result: 'success',
    })

    return NextResponse.json(
      { product },
      { status: 201, headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    if (err instanceof RepositoryConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao criar produto paramétrico.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
