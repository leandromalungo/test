import { requirePortalAccess } from '@/lib/auth/guards'
import { listAuditLogs } from '@/services/audit/audit-service'
import { AuditLogTable } from '@/components/features/shared/audit-log-table'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  await requirePortalAccess(['manager'])
  const logs = await listAuditLogs({ limit: 150 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Registo Imutável de Auditoria
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Todas as acções críticas (simulações, emissões, cálculos, pagamentos e decisões manuais) são registadas sem possibilidade de edição.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
