import { PortalShell } from '@/components/layout/portal-shell'
import { requirePortalAccess } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * Layout do Portal do Operador (Operações & Qualidade).
 * Exige autenticação server-side com papel 'operator'.
 */
export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requirePortalAccess(['operator'])
  return (
    <PortalShell user={ctx.user} authMode={ctx.authMode}>
      {children}
    </PortalShell>
  )
}
