import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'
import { RegisterForm } from '@/components/features/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-lg border border-[#E5E7EB] bg-white p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
              Registo de Produtor Agrícola
            </h1>
            <p className="mt-1.5 text-sm text-[#737373]">
              Crie a sua conta para georreferenciar lavras, simular prémios e subscrever coberturas paramétricas.
            </p>
          </div>
          <RegisterForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
