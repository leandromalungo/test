import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PublicAuthSplit } from '@/components/features/auth/public-auth-split'
import { FarmerLoginForm } from '@/components/features/auth/farmer-login-form'
import { getAuthenticatedContext } from '@/lib/auth/session'
import { isDemoBannerActive } from '@/lib/repositories/platform-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Entrar | NOSSA AgroParamétrico',
  description: 'Acesso reservado ao Portal do Agricultor e cooperativas seguradas.',
}

/**
 * Tela de autenticação exclusiva do Portal do Agricultor (`/login`).
 */
export default async function FarmerLoginPage() {
  const ctx = await getAuthenticatedContext()
  if (ctx?.user.role === 'farmer') {
    redirect('/dashboard')
  }

  const demonstrationMode = await isDemoBannerActive()

  return (
    <PublicAuthSplit
      badgeLabel="Portal do Agricultor"
      heroTitle="Aceda à Sua Protecção"
      heroSubtitle="Entre na sua conta para acompanhar lavras, simulações e pagamentos climáticos."
      steps={[
        { number: '1', label: 'Validar as suas credenciais', active: true },
        { number: '2', label: 'Gerir lavras e coberturas' },
        { number: '3', label: 'Acompanhar indemnizações' },
      ]}
      formTitle="Iniciar Sessão"
    >
      {ctx && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]"
        >
          Existe uma sessão activa com outro perfil ({ctx.user.email}). Ao iniciar sessão aqui como Agricultor, a sessão actual será substituída.
        </div>
      )}

      <FarmerLoginForm demonstrationMode={demonstrationMode} />
    </PublicAuthSplit>
  )
}
