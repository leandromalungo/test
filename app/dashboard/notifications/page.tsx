import { requirePortalAccess } from '@/lib/auth/guards'
import { repoListNotifications } from '@/lib/repositories/platform-repository'
import { NotificationsList } from '@/components/features/farmer/notifications-list'

export const dynamic = 'force-dynamic'

export default async function FarmerNotificationsPage() {
  const ctx = await requirePortalAccess(['farmer'])
  const items = await repoListNotifications({
    role: 'farmer',
    userId: ctx.user.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Notificações
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Alertas sobre emissão de apólices, actualizações climáticas e indemnizações.
        </p>
      </div>
      <NotificationsList initialItems={items} />
    </div>
  )
}
