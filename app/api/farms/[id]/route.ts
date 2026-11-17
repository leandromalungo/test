import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { farmSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoDeleteFarm,
  repoGetFarmById,
  repoUpdateFarm,
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/farms/[id]
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const farm = await repoGetFarmById(id)
  if (!farm) {
    return NextResponse.json(
      { error: 'Propriedade não encontrada.' },
      { status: 404, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  if (
    auth.context.user.role === 'farmer' &&
    farm.customerId !== auth.context.customer?.id
  ) {
    return NextResponse.json(
      { error: 'Acesso não autorizado a esta propriedade.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  return NextResponse.json({ farm }, { headers: NO_STORE_SECURITY_HEADERS })
}

/**
 * PATCH /api/farms/[id]
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const existing = await repoGetFarmById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Propriedade não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      auth.context.user.role === 'farmer' &&
      existing.customerId !== auth.context.customer?.id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado a esta propriedade.' },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const body: unknown = await req.json()
    const parsed = farmSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const { previousState, farm } = await repoUpdateFarm(id, parsed.data)

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'FARM_UPDATED',
      entityType: 'farm',
      entityId: farm.id,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: farm as unknown as Record<string, unknown>,
      result: 'success',
    })

    return NextResponse.json({ farm }, { headers: NO_STORE_SECURITY_HEADERS })
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
          err instanceof Error ? err.message : 'Erro ao actualizar propriedade.',
      },
      { status: 400, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}

/**
 * DELETE /api/farms/[id]
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const auth = await requireRole(['farmer', 'manager'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const existing = await repoGetFarmById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Propriedade não encontrada.' },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    if (
      auth.context.user.role === 'farmer' &&
      existing.customerId !== auth.context.customer?.id
    ) {
      return NextResponse.json(
        { error: 'Acesso não autorizado.' },
        { status: 403, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const deleted = await repoDeleteFarm(id)

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'FARM_DELETED',
      entityType: 'farm',
      entityId: id,
      previousState: { name: deleted.name },
      result: 'success',
    })

    return NextResponse.json(
      { ok: true },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    if (err instanceof RepositoryConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (err instanceof RepositoryNotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Erro ao eliminar propriedade.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
