import { requirePortalAccess } from '@/lib/auth/guards'
import { listAuditLogs } from '@/services/audit/audit-service'
import { AuditLogTable } from '@/components/features/shared/audit-log-table'

export const dynamic = 'force-dynamic'

/**
 * Página de consulta de auditoria operacional para o perfil Operador.
 */
export default async function OperationsAuditPage() {
  await requirePortalAccess(['operator'])
  const logs = await listAuditLogs({ limit: 150 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Histórico de Auditoria Operacional
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Consulta imutável de todas as validações climáticas, comparações entre fontes e decisões manuais registadas na plataforma.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
