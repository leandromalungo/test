import { requirePortalAccess } from '@/lib/auth/guards'
import { ProfileForm } from '@/components/features/farmer/profile-form'

export const dynamic = 'force-dynamic'

export default async function FarmerProfilePage() {
  const ctx = await requirePortalAccess(['farmer'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Perfil Pessoal do Produtor
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Mantenha os seus dados de contacto e localização actualizados.
        </p>
      </div>
      <ProfileForm user={ctx.user} />
    </div>
  )
}
