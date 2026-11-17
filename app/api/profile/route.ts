import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { profileUpdateSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoUpdateProfile,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/profile
 * Obtém o perfil completo do utilizador autenticado.
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response
  return NextResponse.json(
    {
      user: auth.context.user,
      customer: auth.context.customer,
    },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}

/**
 * PATCH /api/profile
 * Actualiza informações pessoais e de contacto do utilizador autenticado.
 */
export async function PATCH(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  try {
    const body: unknown = await req.json()
    const parsed = profileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dados de perfil inválidos.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const result = await repoUpdateProfile(auth.context.user.id, parsed.data)

    await recordAuditLog({
      userId: result.user.id,
      userEmail: result.user.email,
      userRole: result.user.role,
      action: 'PROFILE_UPDATED',
      entityType: 'profile',
      entityId: result.user.id,
      previousState: result.previousState,
      newState: {
        fullName: result.user.fullName,
        phone: result.user.phone,
        province: result.user.province,
        municipality: result.user.municipality,
      },
      result: 'success',
    })

    return NextResponse.json(
      { user: result.user, customer: result.customer },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
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
          err instanceof Error ? err.message : 'Erro ao actualizar perfil.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
