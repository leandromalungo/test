import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { settingsUpdateSchema } from '@/lib/validation/schemas'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoGetSystemSettings,
  repoUpdateSystemSettings,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/admin/settings
 */
export async function GET() {
  const auth = await requireRole(['manager', 'operator'])
  if (!auth.ok) return auth.response

  const settings = await repoGetSystemSettings()
  return NextResponse.json(
    { settings },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}

/**
 * PATCH /api/admin/settings
 * Permite ao Gestor ajustar limiares globais de qualidade de dados sem alterar código-fonte.
 */
export async function PATCH(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['manager'])
  if (!auth.ok) return auth.response

  try {
    const body: unknown = await req.json()
    const parsed = settingsUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Configurações inválidas.' },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const { previousState, newState } = await repoUpdateSystemSettings(
      parsed.data
    )

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'system_settings',
      entityId: 'global',
      previousState: previousState as unknown as Record<string, unknown>,
      newState: newState as unknown as Record<string, unknown>,
      result: 'success',
    })

    return NextResponse.json(
      { settings: newState },
      { headers: NO_STORE_SECURITY_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao actualizar configurações.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
