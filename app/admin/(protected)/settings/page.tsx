import { requirePortalAccess } from '@/lib/auth/guards'
import { repoGetSystemSettings } from '@/lib/repositories/platform-repository'
import { SettingsForm } from '@/components/features/admin/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requirePortalAccess(['manager'])
  const settings = await repoGetSystemSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Defina os limiares globais de qualidade de dados e regras de automatização.
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  )
}
