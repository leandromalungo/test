import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/**
 * Configuração tipográfica da plataforma:
 * - Plus Jakarta Sans para títulos e navegação institucional.
 * - Public Sans para leitura densa em formulários, tabelas e relatórios.
 * - JetBrains Mono para valores financeiros em AOA, coordenadas e precipitação em mm.
 */
const headingFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
})

const bodyFont = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

const codeFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-code',
})

export const metadata: Metadata = {
  title: 'NOSSA AgroParamétrico | Seguro Agrícola Paramétrico para Angola',
  description:
    'Plataforma de gestão de seguros agrícolas paramétricos para o mercado angolano, com monitorização climática verificável contra seca e excesso de chuva.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-AO"
      className={`${headingFont.variable} ${bodyFont.variable} ${codeFont.variable}`}
    >
      <body className="min-h-screen bg-[#FFFFFF] text-[#171717] antialiased">
        {children}
      </body>
    </html>
  )
}
