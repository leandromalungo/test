import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'
import { FarmerLoginForm } from '@/components/features/auth/farmer-login-form'
import { getAuthenticatedContext } from '@/lib/auth/session'
import { isDemoBannerActive } from '@/lib/repositories/platform-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Acesso do Agricultor | NOSSA AgroParamétrico',
  description: 'Área reservada aos produtores rurais e cooperativas seguradas.',
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
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#16A34A]">
              Portal do Agricultor
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
              Entrar na Conta Rural
            </h1>
            <p className="mt-1.5 text-sm text-[#737373]">
              Faça a gestão das suas propriedades, simule coberturas e acompanhe apólices.
            </p>
          </div>

          {ctx && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]"
            >
              Existe uma sessão activa com outro perfil ({ctx.user.email}). Ao iniciar sessão aqui como Agricultor, a sessão actual será substituída.
            </div>
          )}

          <FarmerLoginForm demonstrationMode={demonstrationMode} />
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
