import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ManagerLoginForm } from '@/components/features/auth/manager-login-form'
import { getAuthenticatedContext } from '@/lib/auth/session'
import { isDemoBannerActive } from '@/lib/repositories/platform-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Acesso Executivo · Gestão | NOSSA AgroParamétrico',
  robots: { index: false, follow: false },
}

/**
 * Tela de autenticação exclusiva do Portal de Gestão NOSSA Seguros (`/admin/login`).
 * Totalmente isolada do portal público dos agricultores e do portal operacional.
 */
export default async function ManagerLoginPage() {
  const ctx = await getAuthenticatedContext()
  if (ctx?.user.role === 'manager') {
    redirect('/admin')
  }

  const demonstrationMode = await isDemoBannerActive()

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-bold tracking-tight text-[#171717]">
            NOSSA AgroParamétrico · Gestão Executiva
          </span>
          <Link href="/" className="text-xs font-medium text-[#737373] hover:text-[#171717]">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
              Administração · NOSSA Seguros
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
              Portal do Gestor
            </h1>
            <p className="mt-1.5 text-sm text-[#737373]">
              Autenticação reservada para gestão de produtos, carteira, exposição e auditoria.
            </p>
          </div>

          {ctx && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]"
            >
              Sessão detectada com outro perfil ({ctx.user.email}). Apenas contas de Gestor são aceites neste portal.
            </div>
          )}

          <ManagerLoginForm demonstrationMode={demonstrationMode} />
        </div>
      </main>
    </div>
  )
}
