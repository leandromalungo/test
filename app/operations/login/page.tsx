import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { OperatorLoginForm } from '@/components/features/auth/operator-login-form'
import { getAuthenticatedContext } from '@/lib/auth/session'
import { isDemoBannerActive } from '@/lib/repositories/platform-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Acesso Técnico · Operações | NOSSA AgroParamétrico',
  robots: { index: false, follow: false },
}

/**
 * Tela de autenticação exclusiva do Portal de Operações & Qualidade (`/operations/login`).
 * Totalmente isolada dos portais de Agricultor e Gestor.
 */
export default async function OperatorLoginPage() {
  const ctx = await getAuthenticatedContext()
  if (ctx?.user.role === 'operator') {
    redirect('/operations')
  }

  const demonstrationMode = await isDemoBannerActive()

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-bold tracking-tight text-[#171717]">
            NOSSA AgroParamétrico · Operações & Qualidade
          </span>
          <Link href="/" className="text-xs font-medium text-[#737373] hover:text-[#171717]">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Controlo Climático & Excepções
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">
              Portal do Operador
            </h1>
            <p className="mt-1.5 text-sm text-[#737373]">
              Autenticação restrita para validação de séries meteorológicas e tratamento manual de excepções.
            </p>
          </div>

          {ctx && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]"
            >
              Sessão detectada com outro perfil ({ctx.user.email}). Apenas contas de Operador são aceites neste portal.
            </div>
          )}

          <OperatorLoginForm demonstrationMode={demonstrationMode} />
        </div>
      </main>
    </div>
  )
}
