import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6FA] px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-[1060px] gap-4 rounded-[28px] border border-[#E5E7EB] bg-white p-3.5 shadow-xl shadow-slate-900/5 sm:p-4 lg:grid-cols-12">
        <div className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[22px] bg-[#1E3FD8] p-7 text-white sm:p-9 lg:col-span-6 lg:min-h-[580px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 75% 42%, rgba(92, 204, 255, 0.92) 0%, rgba(47, 134, 245, 0.55) 38%, rgba(28, 56, 198, 0.96) 82%), radial-gradient(circle at 12% 92%, rgba(78, 192, 255, 0.7) 0%, rgba(25, 45, 165, 0) 55%)',
            }}
          />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold tracking-tight text-white">
              NOSSA · Operações &amp; Qualidade
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Início</span>
            </Link>
          </div>

          <div className="relative z-10 mt-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/18 px-3.5 py-1.5 text-[12px] font-medium text-white backdrop-blur-md">
              <ShieldAlert className="h-3.5 w-3.5 text-[#C8F135]" aria-hidden="true" />
              <span>Controlo Climático &amp; Excepções</span>
            </span>

            <h1 className="mt-4 text-balance text-[28px] font-semibold leading-[1.14] tracking-[-0.025em] text-white sm:text-[34px]">
              Auditoria Climática Técnica
            </h1>
            <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-white/85 sm:text-[14px]">
              Autenticação restrita para validação de séries meteorológicas e resolução de excepções.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
              <div className="flex min-h-[112px] flex-col justify-between rounded-2xl bg-white p-3.5 text-[#0D1526] shadow-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1D4ED8] text-[11px] font-semibold text-white">
                  1
                </span>
                <p className="mt-3 text-[12px] font-semibold leading-snug text-[#0D1526]">
                  Validar acesso de Operador
                </p>
              </div>
              <div className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-white/25 bg-white/15 p-3.5 text-white backdrop-blur-md">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-[11px] font-semibold text-white">
                  2
                </span>
                <p className="mt-3 text-[12px] font-medium leading-snug text-white/90">
                  Inspecionar qualidade ERA5 vs NASA
                </p>
              </div>
              <div className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-white/25 bg-white/15 p-3.5 text-white backdrop-blur-md">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-[11px] font-semibold text-white">
                  3
                </span>
                <p className="mt-3 text-[12px] font-medium leading-snug text-white/90">
                  Decidir e encerrar excepções
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-3 py-5 sm:px-8 lg:col-span-6 lg:px-10">
          <h2 className="mb-6 text-center text-[24px] font-semibold tracking-[-0.02em] text-[#0D1526] sm:text-[26px]">
            Portal do Operador
          </h2>

          {ctx && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#B45309]"
            >
              Sessão detectada com outro perfil ({ctx.user.email}). Apenas contas de Operador são aceites neste portal.
            </div>
          )}

          <OperatorLoginForm demonstrationMode={demonstrationMode} />
        </div>
      </div>
    </div>
  )
}
