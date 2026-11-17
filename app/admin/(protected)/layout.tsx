import { PortalShell } from '@/components/layout/portal-shell'
import { requirePortalAccess } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requirePortalAccess(['manager'])
  return (
    <PortalShell user={ctx.user} authMode={ctx.authMode}>
      {children}
    </PortalShell>
  )
}
