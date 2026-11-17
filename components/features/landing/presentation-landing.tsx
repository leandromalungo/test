'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowUpRight, CloudRain, Sun } from 'lucide-react'

interface PresentationLandingProps {
  activeProductsCount: number
  provincesCount: number
}

const SEVERITY_ROWS = [
  { label: 'Seca Severa', filledDots: 10, totalDots: 10, payout: '100%' },
  { label: 'Excesso Chuva', filledDots: 8, totalDots: 10, payout: '75%' },
  { label: 'Seca Moderada', filledDots: 6, totalDots: 10, payout: '50%' },
]

const FIELD_SPECIALISTS = [
  {
    src: '/images/landing/avatar-1.jpg',
    alt: 'Engenheira agrónoma da rede NOSSA AgroParamétrico',
  },
  {
    src: '/images/landing/avatar-2.jpg',
    alt: 'Produtor agrícola angolano acompanhado pela plataforma',
  },
  {
    src: '/images/landing/avatar-3.jpg',
    alt: 'Especialista de dados climáticos da NOSSA AgroParamétrico',
  },
]

export function PresentationLanding({
  activeProductsCount,
  provincesCount,
}: PresentationLandingProps) {
  const [excessRainMode, setExcessRainMode] = useState(false)

  return (
    <div className="min-h-screen bg-white text-[#0D1526]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Barra superior de 3 zonas */}
        <header className="flex h-[76px] items-center justify-between gap-4 sm:gap-8">
          <Link
            href="/"
            className="text-[17px] sm:text-[18px] font-semibold tracking-[-0.02em] text-[#0D1526] whitespace-nowrap shrink-0"
          >
            NOSSA AgroParamétrico
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-6 text-[13px] font-medium text-[#525252] md:flex"
          >
            <a
              href="#sobre"
              className="rounded-full bg-[#F3F4F6] px-3.5 py-1.5 text-[#0D1526] transition-colors hover:bg-[#E5E7EB] whitespace-nowrap shrink-0"
            >
              Sobre Nós
            </a>
            <Link
              href="/products"
              className="transition-colors hover:text-[#0D1526] whitespace-nowrap shrink-0"
            >
              Produtos
            </Link>
            <Link
              href="/how-it-works"
              className="transition-colors hover:text-[#0D1526] whitespace-nowrap shrink-0"
            >
              Como Funciona
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-[#0D1526] whitespace-nowrap shrink-0"
            >
              Termos
            </Link>
            <a
              href="#portais"
              className="transition-colors hover:text-[#0D1526] whitespace-nowrap shrink-0"
            >
              Portais
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0D1526] px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1E293B] whitespace-nowrap shrink-0"
            >
              <span>Simular Agora</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Sub-navegação compacta apenas para ecrãs móveis */}
        <nav
          aria-label="Navegação rápida"
          className="mb-3 flex items-center gap-4 overflow-x-auto pb-1 text-[12px] font-medium text-[#525252] md:hidden"
        >
          <a
            href="#sobre"
            className="rounded-full bg-[#F3F4F6] px-3 py-1 text-[#0D1526] whitespace-nowrap shrink-0"
          >
            Sobre Nós
          </a>
          <Link href="/products" className="whitespace-nowrap shrink-0 hover:text-[#0D1526]">
            Produtos
          </Link>
          <Link href="/how-it-works" className="whitespace-nowrap shrink-0 hover:text-[#0D1526]">
            Como Funciona
          </Link>
          <Link href="/terms" className="whitespace-nowrap shrink-0 hover:text-[#0D1526]">
            Termos
          </Link>
          <a href="#portais" className="whitespace-nowrap shrink-0 hover:text-[#0D1526]">
            Portais
          </a>
        </nav>

        <main>
          {/* Secção Hero Fotográfica Dominante com Céu Azul e Produtores no Campo */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-1 flex min-h-[500px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#1D78C6] sm:min-h-[540px] lg:min-h-[570px]"
          >
            {/* Fotografia hero alinhada ao topo para preservar o céu azul livre atrás da manchete */}
            <Image
              src="/images/landing/hero-angola-agro.jpg"
              alt="Agricultor e agrónoma angolanos a monitorizar uma lavra de milho sob céu limpo"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              referrerPolicy="no-referrer"
              className="object-cover object-[center_18%]"
            />

            {/* Scrims medidos de contraste no topo (para título branco) e base (para rodapé do hero) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0C4A8A]/45 via-[#0C4A8A]/10 to-[#0B1324]/70"
            />

            {/* Manchete central, subtítulo e botão escuro */}
            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-10 pb-6 text-center sm:pt-12">
              <h1 className="text-balance text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-white drop-shadow-[0_2px_12px_rgba(11,19,36,0.35)] sm:text-[44px] lg:text-[48px]">
                Proteja a Sua Colheita Hoje.
                <br />
                Tudo Num Só Lugar.
              </h1>
              <p className="mt-3.5 max-w-xl text-[14px] leading-relaxed text-white/95 drop-shadow-[0_1px_6px_rgba(11,19,36,0.45)] sm:text-[15px]">
                Junte-se à nova geração de seguro agrícola paramétrico em Angola — onde dados de satélite verificáveis garantem cobertura transparente e protecção imediata.
              </p>
              <div className="mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-[#0D1526] px-6 py-3 text-[13px] font-medium text-white shadow-lg shadow-[#0D1526]/30 transition-all hover:bg-[#17223B] whitespace-nowrap shrink-0"
                >
                  Simular a sua cobertura
                </Link>
              </div>
            </div>

            {/* Rodapé interno do Hero: equipa + avatares à esquerda e portais à direita */}
            <div className="relative z-10 flex flex-col justify-between gap-4 px-6 pb-6 pt-14 sm:flex-row sm:items-end sm:px-8">
              <div className="flex items-center gap-3.5">
                <p className="text-[11px] font-medium leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
                  Valide com dados reais.
                  <br />
                  Proteja resultados reais.
                </p>
                <div className="flex items-center rounded-full border border-white/40 bg-white/30 px-2 py-1 backdrop-blur-md">
                  <div className="flex -space-x-2">
                    {FIELD_SPECIALISTS.map((person) => (
                      <div
                        key={person.src}
                        className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-[#1E293B]"
                      >
                        <Image
                          src={person.src}
                          alt={person.alt}
                          fill
                          sizes="28px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-80 whitespace-nowrap"
                >
                  <span>Agricultor</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-80 whitespace-nowrap"
                >
                  <span>Gestor</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  href="/operations/login"
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-80 whitespace-nowrap"
                >
                  <span>Operador</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Secção Editorial: Etiqueta à esquerda + Declaração institucional à direita */}
          <section
            id="sobre"
            className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-12 lg:items-start"
          >
            <div className="lg:col-span-5">
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-[12px] font-medium text-[#525252]">
                Sobre a NOSSA
              </span>
            </div>
            <div className="lg:col-span-7">
              <h2 className="text-balance text-[22px] font-medium leading-[1.3] tracking-[-0.02em] text-[#0D1526] sm:text-[26px]">
                Na NOSSA AgroParamétrico, não apenas emitimos apólices — protegemos campanhas agrícolas inteiras. Criada para produtores de todo o país, a nossa plataforma valida gatilhos climáticos com transparência.
              </h2>
            </div>
          </section>

          {/* Grelha de 3 Cartões Assimétricos (Cartão Escuro + Cartão Foto Central + Cartão Métricas) */}
          <section className="mt-10 grid gap-5 md:grid-cols-3 items-stretch">
            {/* Cartão 1: Fundo Escuro com Alternador Seca / Excesso de Chuva */}
            <div className="flex min-h-[316px] flex-col justify-between rounded-[24px] bg-[#0B1324] p-6 lg:p-7 text-white">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white">
                  {excessRainMode ? (
                    <CloudRain className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Sun className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#94A3B8]">
                  {excessRainMode ? 'Excesso de Chuva' : 'Défice Hídrico'}
                </span>
              </div>

              <p className="my-6 text-[17px] lg:text-[18px] font-medium leading-[1.38] tracking-[-0.015em]">
                {excessRainMode ? (
                  <>
                    <span className="text-white">Protecção contra chuvas intensas </span>
                    <span className="text-[#94A3B8]">
                      com validação dupla ERA5 e NASA POWER —{' '}
                    </span>
                    <span className="text-white">
                      indemnização automática em qualquer campanha.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-white">Cobertura paramétrica contra seca </span>
                    <span className="text-[#94A3B8]">
                      com monitorização diária nas suas coordenadas —{' '}
                    </span>
                    <span className="text-white">
                      protecção contínua em qualquer época agrícola.
                    </span>
                  </>
                )}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={excessRainMode}
                  aria-label="Alternar modo de cobertura entre Seca e Excesso de Chuva"
                  onClick={() => setExcessRainMode((prev) => !prev)}
                  className="inline-flex items-center gap-3 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B92E4]"
                >
                  <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#2B92E4] p-0.5 transition-colors">
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        excessRainMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                  <span className="text-[12px] font-medium text-white whitespace-nowrap">
                    {excessRainMode ? 'Modo Chuva' : 'Modo Seca'}
                  </span>
                </button>
              </div>
            </div>

            {/* Cartão 2: Fotografia Central Luminosa com Botão Frosted Translúcido abaixo do rosto */}
            <div className="relative flex min-h-[316px] items-center justify-center overflow-hidden rounded-[24px] bg-[#3E96DC] p-6 pt-16 lg:p-7 lg:pt-16">
              <Image
                src="/images/landing/card-center-crops.jpg"
                alt="Especialista agrónoma junto à estação meteorológica e cultura de milho sob céu azul"
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                referrerPolicy="no-referrer"
                className="object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[#0B1324]/18"
              />
              <Link
                href="/products"
                className="relative z-10 inline-flex items-center justify-center rounded-full border border-white/60 bg-white/30 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/40 whitespace-nowrap"
              >
                Coberturas Seca &amp; Chuva ({activeProductsCount})
              </Link>
            </div>

            {/* Cartão 3: Cartão Claro com Grande Número + Matriz de Pontos Azuis */}
            <div className="flex min-h-[316px] flex-col justify-between rounded-[24px] bg-[#F4F6F9] p-6 lg:p-7">
              <div>
                <p className="text-[42px] font-semibold leading-none tracking-[-0.03em] text-[#0D1526] tabular-nums">
                  {provincesCount}+
                </p>
                <p className="mt-2 text-[14px] font-semibold text-[#0D1526]">
                  Províncias Cobertas
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B7280]">
                  Regras paramétricas auditáveis por janela climática e liquidação proporcional em Kwanzas.
                </p>
              </div>

              <div className="mt-6 space-y-2.5">
                {SEVERITY_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-2 lg:gap-3 text-[11px] lg:text-[12px]"
                  >
                    <span className="w-[82px] lg:w-[96px] shrink-0 truncate text-[#525252]">
                      {row.label}
                    </span>
                    <div
                      className="flex items-center gap-0.5 lg:gap-1"
                      aria-hidden="true"
                    >
                      {Array.from({ length: row.totalDots }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full ${
                            idx < row.filledDots
                              ? 'bg-[#2B92E4]'
                              : 'bg-[#DCE3EC]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-8 lg:w-9 text-right font-medium text-[#0D1526] tabular-nums">
                      {row.payout}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Faixa Inferior de Números (4 Colunas) */}
          <section className="mt-14 pb-14 text-center lg:mt-16">
            <h2 className="text-[16px] font-medium text-[#0D1526] sm:text-[18px]">
              Mais alguns factos sobre a nossa cobertura em números
            </h2>

            <div className="mt-9 grid grid-cols-2 gap-8 lg:grid-cols-4">
              <div>
                <p className="text-[32px] font-semibold tracking-[-0.03em] text-[#0D1526] tabular-nums sm:text-[38px]">
                  85%+
                </p>
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Completude climática mínima exigida
                </p>
              </div>
              <div>
                <p className="text-[32px] font-semibold tracking-[-0.03em] text-[#0D1526] tabular-nums sm:text-[38px]">
                  2 Fontes
                </p>
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Open-Meteo ERA5 &amp; NASA POWER
                </p>
              </div>
              <div>
                <p className="text-[32px] font-semibold tracking-[-0.03em] text-[#0D1526] tabular-nums sm:text-[38px]">
                  {provincesCount}
                </p>
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Províncias agrícolas em Angola
                </p>
              </div>
              <div>
                <p className="text-[32px] font-semibold tracking-[-0.03em] text-[#0D1526] tabular-nums sm:text-[38px]">
                  25%–100%
                </p>
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Faixas de indemnização em AOA
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Rodapé discreto para acesso rápido aos 3 portais e páginas legais */}
        <footer
          id="portais"
          className="flex flex-col items-center justify-between gap-4 border-t border-[#E5E7EB] py-7 text-[12px] text-[#6B7280] sm:flex-row"
        >
          <p className="font-medium text-[#0D1526]">
            NOSSA AgroParamétrico · Mercado Angolano
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/login" className="transition-colors hover:text-[#0D1526]">
              Portal do Agricultor
            </Link>
            <Link href="/admin/login" className="transition-colors hover:text-[#0D1526]">
              Portal do Gestor
            </Link>
            <Link href="/operations/login" className="transition-colors hover:text-[#0D1526]">
              Portal do Operador
            </Link>
            <Link href="/terms" className="transition-colors hover:text-[#0D1526]">
              Termos
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[#0D1526]">
              Privacidade
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
