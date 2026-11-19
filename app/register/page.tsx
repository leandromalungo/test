import type { Metadata } from 'next'
import { PublicAuthSplit } from '@/components/features/auth/public-auth-split'
import { RegisterForm } from '@/components/features/auth/register-form'

export const metadata: Metadata = {
  title: 'Criar Conta | NOSSA AgroParamétrico',
  description: 'Registo de produtores agrícolas e cooperativas na plataforma NOSSA AgroParamétrico.',
}

/**
 * Página de registo de novos agricultores (`/register`).
 */
export default function RegisterPage() {
  return (
    <PublicAuthSplit
      badgeLabel="Junte-se a Nós"
      heroTitle="Comece a Sua Jornada"
      heroSubtitle="Siga estes passos simples para configurar a sua conta de produtor agrícola."
      steps={[
        { number: '1', label: 'Registar a sua conta', active: true },
        { number: '2', label: 'Configurar a sua propriedade' },
        { number: '3', label: 'Simular e emitir apólice' },
      ]}
      formTitle="Criar Conta"
    >
      <RegisterForm />
    </PublicAuthSplit>
  )
}
