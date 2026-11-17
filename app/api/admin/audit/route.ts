import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { listAuditLogs } from '@/services/audit/audit-service'

/**
 * GET /api/admin/audit
 * Consulta o registo imutável de auditoria (exclusivo para Gestores e Operadores).
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(['manager', 'operator'])
  if (!auth.ok) return auth.response

  const entityType = req.nextUrl.searchParams.get('entityType') || undefined
  const action = req.nextUrl.searchParams.get('action') || undefined
  const logs = await listAuditLogs({ entityType, action, limit: 150 })

  return NextResponse.json({ logs }, { headers: NO_STORE_SECURITY_HEADERS })
}
