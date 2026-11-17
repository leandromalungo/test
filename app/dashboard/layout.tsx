import { PortalShell } from '@/components/layout/portal-shell'
import { requirePortalAccess } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export default async function FarmerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requirePortalAccess(['farmer'])
  return (
    <PortalShell user={ctx.user} authMode={ctx.authMode}>
      {children}
    </PortalShell>
  )
}
