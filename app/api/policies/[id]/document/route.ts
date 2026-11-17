import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { generatePolicyPdfBytes } from '@/services/policies/pdf-generator'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/policies/[id]/document
 * Gera e devolve o certificado digital da apólice em formato PDF (binário server-side).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['farmer', 'manager', 'operator'])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const state = await loadPlatformState({
    role: auth.context.user.role,
    customerId: auth.context.customer?.id ?? null,
    userId: auth.context.user.id,
  })
  const policy = state.policies.find((p) => p.id === id)
  if (!policy) {
    return NextResponse.json(
      { error: 'Apólice não encontrada.' },
      { status: 404, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  if (
    auth.context.user.role === 'farmer' &&
    policy.customerId !== auth.context.customer?.id
  ) {
    return NextResponse.json(
      { error: 'Não tem permissão para descarregar esta apólice.' },
      { status: 403, headers: NO_STORE_SECURITY_HEADERS }
    )
  }

  const pdfBytes = await generatePolicyPdfBytes(policy)

  await recordAuditLog({
    userId: auth.context.user.id,
    userEmail: auth.context.user.email,
    userRole: auth.context.user.role,
    action: 'POLICY_PDF_DOWNLOADED',
    entityType: 'policy',
    entityId: policy.id,
    metadata: { policyNumber: policy.policyNumber },
    result: 'success',
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Apolice-${policy.policyNumber}.pdf"`,
      ...NO_STORE_SECURITY_HEADERS,
    },
  })
}
