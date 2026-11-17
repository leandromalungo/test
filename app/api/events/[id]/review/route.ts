import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/session'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  repoReviewClimateEvent,
  RepositoryNotFoundError,
} from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

const reviewSchema = z.object({
  status: z.enum(['manual_review', 'rejected', 'trigger_activated']),
  notes: z.string().min(8).max(500),
})

/**
 * POST /api/events/[id]/review
 * Permite ao operador ou gestor registar uma revisão técnica sobre um evento climático.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const auth = await requireRole(['operator', 'manager'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const body: unknown = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Dados de revisão inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const { previousStatus, event } = await repoReviewClimateEvent({
      eventId: id,
      status: parsed.data.status,
      notes: parsed.data.notes,
    })

    await recordAuditLog({
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      userRole: auth.context.user.role,
      action: 'EVENT_MANUALLY_REVIEWED',
      entityType: 'climate_event',
      entityId: event.id,
      previousState: { status: previousStatus },
      newState: { status: event.status, notes: parsed.data.notes },
      result: 'success',
    })

    return NextResponse.json({ event }, { headers: NO_STORE_SECURITY_HEADERS })
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
            : 'Erro ao registar revisão técnica.',
      },
      { status: 500, headers: NO_STORE_SECURITY_HEADERS }
    )
  }
}
