import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import {
  enforceCsrfProtection,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoListNotifications,
  repoMarkNotificationsRead,
} from '@/lib/repositories/platform-repository'

/**
 * GET /api/notifications
 * Lista notificações do utilizador autenticado ou do seu perfil funcional.
 */
export async function GET() {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const notifications = await repoListNotifications({
    userId: auth.context.user.id,
    role: auth.context.user.role,
  })

  return NextResponse.json(
    { notifications },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}

/**
 * PATCH /api/notifications
 * Marca notificações como lidas.
 */
export async function PATCH(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => ({}))) as { id?: string }
  await repoMarkNotificationsRead(
    {
      userId: auth.context.user.id,
      role: auth.context.user.role,
    },
    body.id
  )

  return NextResponse.json({ ok: true }, { headers: NO_STORE_SECURITY_HEADERS })
}
