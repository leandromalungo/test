import { Sprout } from 'lucide-react'
import { BrandMark } from '@/components/layout/brand-mark'
import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'

interface StepItem {
  number: string
  label: string
  active?: boolean
}

interface PublicAuthSplitProps {
  badgeLabel: string
  heroTitle: string
  heroSubtitle: string
  steps: [StepItem, StepItem, StepItem]
  formTitle: string
  children: React.ReactNode
}

/**
 * Moldura pública em duas colunas partilhada entre `/login` e `/register`.
 * Importa a navbar e o rodapé únicos do projecto, mantendo os portais internos isolados.
 */
export function PublicAuthSplit({
  badgeLabel,
  heroTitle,
  heroSubtitle,
  steps,
  formTitle,
  children,
}: PublicAuthSplitProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0D1526]">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid w-full max-w-[1060px] gap-4 rounded-[28px] border border-[#E5E7EB] bg-white p-3.5 shadow-xl shadow-slate-900/5 sm:p-4 lg:grid-cols-12">
          {/* Painel esquerdo com malha azul luminosa e 3 passos */}
          <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[22px] bg-[#1E3FD8] p-7 text-white sm:p-9 lg:col-span-6 lg:min-h-[600px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 75% 42%, rgba(92, 204, 255, 0.92) 0%, rgba(47, 134, 245, 0.55) 38%, rgba(28, 56, 198, 0.96) 82%), radial-gradient(circle at 12% 92%, rgba(78, 192, 255, 0.7) 0%, rgba(25, 45, 165, 0) 55%)',
              }}
            />

            <div className="relative z-10">
              <BrandMark href="/" tone="light" />
            </div>

            <div className="relative z-10 mt-14">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/18 px-3.5 py-1.5 text-[12px] font-medium text-white backdrop-blur-md">
                <Sprout className="h-3.5 w-3.5 text-[#C8F135]" aria-hidden="true" />
                <span>{badgeLabel}</span>
              </span>

              <h1 className="mt-4 text-balance text-[28px] font-semibold leading-[1.14] tracking-[-0.025em] text-white sm:text-[34px]">
                {heroTitle}
              </h1>
              <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-white/85 sm:text-[14px]">
                {heroSubtitle}
              </p>

              <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={
                      step.active
                        ? 'flex min-h-[112px] flex-col justify-between rounded-2xl bg-white p-3.5 text-[#0D1526] shadow-sm'
                        : 'flex min-h-[112px] flex-col justify-between rounded-2xl border border-white/25 bg-white/15 p-3.5 text-white backdrop-blur-md'
                    }
                  >
                    <span
                      className={
                        step.active
                          ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1D4ED8] text-[11px] font-semibold text-white'
                          : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-[11px] font-semibold text-white'
                      }
                    >
                      {step.number}
                    </span>
                    <p
                      className={
                        step.active
                          ? 'mt-3 text-[12px] font-semibold leading-snug text-[#0D1526]'
                          : 'mt-3 text-[12px] font-medium leading-snug text-white/90'
                      }
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Painel direito com formulário limpo */}
          <div className="flex flex-col justify-center px-3 py-5 sm:px-8 lg:col-span-6 lg:px-10">
            <h2 className="mb-6 text-center text-[24px] font-semibold tracking-[-0.02em] text-[#0D1526] sm:text-[26px]">
              {formTitle}
            </h2>
            {children}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
