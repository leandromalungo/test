import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * GET /api/admin/reports
 * Gera relatórios operacionais e financeiros em JSON ou CSV descarregável (`?format=csv`).
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(['manager'])
  if (!auth.ok) return auth.response

  const format = req.nextUrl.searchParams.get('format') || 'json'
  const state = await loadPlatformState({
    role: auth.context.user.role,
    userId: auth.context.user.id,
  })

  const rows = state.policies.map((p) => {
    const eventsCount = state.climateEvents.filter(
      (e) => e.policyId === p.id
    ).length
    const indemnityTotal = state.indemnities
      .filter((i) => i.policyId === p.id)
      .reduce((sum, i) => sum + i.calculatedIndemnityAoa, 0)

    return {
      policyNumber: p.policyNumber,
      customerName: p.customerName,
      province: p.province,
      farmName: p.farmName,
      cropName: p.cropName,
      coverageType: p.contractTerms.coverageType,
      status: p.status,
      insuredCapitalAoa: p.insuredCapitalAoa,
      premiumAoa: p.premiumAoa,
      eventsCount,
      indemnityTotalAoa: indemnityTotal,
    }
  })

  await recordAuditLog({
    userId: auth.context.user.id,
    userEmail: auth.context.user.email,
    userRole: auth.context.user.role,
    action: 'REPORT_EXPORTED',
    entityType: 'report',
    entityId: format,
    metadata: { rowCount: rows.length },
    result: 'success',
  })

  if (format === 'csv') {
    const header = [
      'Numero_Apolice',
      'Segurado',
      'Provincia',
      'Propriedade',
      'Cultura',
      'Cobertura',
      'Estado',
      'Capital_Segurado_AOA',
      'Premio_AOA',
      'Eventos',
      'Indemnizacao_Total_AOA',
    ].join(',')

    const csvLines = rows.map((r) =>
      [
        r.policyNumber,
        `"${r.customerName}"`,
        `"${r.province}"`,
        `"${r.farmName}"`,
        `"${r.cropName}"`,
        r.coverageType,
        r.status,
        r.insuredCapitalAoa.toFixed(2),
        r.premiumAoa.toFixed(2),
        r.eventsCount,
        r.indemnityTotalAoa.toFixed(2),
      ].join(',')
    )

    return new NextResponse([header, ...csvLines].join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="relatorio-apolices-nossa-agro.csv"',
        ...NO_STORE_SECURITY_HEADERS,
      },
    })
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      rows,
    },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
