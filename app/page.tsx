import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Star, Sun } from 'lucide-react'
import { ANGOLA_PROVINCES, formatAOA } from '@/config/angola'
import { loadPublicCatalog } from '@/lib/repositories/platform-repository'
import { PublicNavbar } from '@/components/layout/public-navbar'
import { PublicFooter } from '@/components/layout/public-footer'
import { SpecialistAvatarStack } from '@/components/ui/specialist-avatar-stack'
import { LimeActionLink } from '@/components/ui/lime-action-link'

export const dynamic = 'force-dynamic'

const SOLUTION_CARDS = [
  {
    title: 'Cobertura Contra Seca',
    subtitle: 'Défice hídrico em milho, feijão e mandioca',
    image: '/images/landing/solution-drought-maize.jpg',
    alt: 'Cultura de milho em Angola com sensor climático alimentado a energia solar sob céu azul',
    href: '#beneficios',
  },
  {
    title: 'Excesso de Chuva',
    subtitle: 'Protecção contra alagamentos e chuvas extremas',
    image: '/images/landing/solution-excess-rain.jpg',
    alt: 'Vale agrícola e bacia hidrográfica em Angola com terras férteis e infra-estrutura hídrica',
    href: '#beneficios',
  },
  {
    title: 'Monitorização por Satélite',
    subtitle: 'Validação cruzada Open-Meteo ERA5 & NASA POWER',
    image: '/images/landing/solution-satellite-monitoring.jpg',
    alt: 'Estações meteorológicas alinhadas ao longo de planícies agrícolas verdes em Angola',
    href: '#beneficios',
  },
] as const

const MECHANISM_STEPS = [
  {
    step: '01.',
    title: 'Recolha Climática Dupla',
    description:
      'Precipitação diária (mm) medida nas coordenadas exactas da lavra via Open-Meteo ERA5 e NASA POWER.',
  },
  {
    step: '02.',
    title: 'Auditoria de Qualidade ≥ 85%',
    description:
      'Dias sem leitura nunca são convertidos em zero. Divergências acima do limite seguem para revisão operacional.',
  },
  {
    step: '03.',
    title: 'Termos Imutáveis na Apólice',
    description:
      'Gatilho, janela de observação e faixas de severidade ficam congelados na versão emitida ao produtor.',
  },
  {
    step: '04.',
    title: 'Liquidação Proporcional em AOA',
    description:
      'Indemnizações proporcionais ao desvio observado (25%, 50%, 75% ou 100% do capital segurado).',
  },
] as const

const SEVERITY_SCALE = [
  { tier: 'Dentro do normal', deviation: '0% a 10%', payout: '0%' },
  { tier: 'Desvio moderado', deviation: '10% a 25%', payout: '25%' },
  { tier: 'Desvio significativo', deviation: '25% a 45%', payout: '50%' },
  { tier: 'Desvio severo', deviation: '45% a 65%', payout: '75%' },
  { tier: 'Desvio extremo', deviation: '≥ 65%', payout: '100%' },
] as const

const PORTALS = [
  {
    role: 'Produtores & Cooperativas',
    title: 'Portal do Agricultor',
    description:
      'Georreferencie lavras, simule prémios paramétricos e acompanhe o estado das suas apólices.',
    href: '/login',
    cta: 'Entrar como Agricultor',
  },
  {
    role: 'Subscrição & Carteira',
    title: 'Portal do Gestor',
    description:
      'Configure produtos, audite exposição por província, execute monitorização e aprove liquidações.',
    href: '/admin/login',
    cta: 'Acesso do Gestor',
  },
  {
    role: 'Qualidade & Excepções',
    title: 'Portal do Operador',
    description:
      'Investigue divergências entre fontes meteorológicas e resolva excepções com trilha de auditoria.',
    href: '/operations/login',
    cta: 'Acesso do Operador',
  },
] as const

export default async function LandingPage() {
  const { crops, products } = await loadPublicCatalog()
  const activeProducts = products.filter((p) => p.status === 'active')
  const provincesCount = ANGOLA_PROVINCES.length

  return (
    <div className="min-h-screen bg-white text-[#0D1526]">
      {/* Secção 1: Hero Full-Bleed com Navbar Única Transparente Sobreposta */}
      <section
        id="inicio"
        className="relative flex min-h-[650px] w-full flex-col justify-between overflow-hidden bg-[#0B4EA2] lg:min-h-[710px]"
      >
        <PublicNavbar />

        <Image
          src="/images/landing/hero-angola-agro.jpg"
          alt="Agrónoma e produtor angolano a monitorizar uma lavra de milho sob céu limpo"
          fill
          priority
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-[center_22%]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06397A]/70 via-[#0C4A8A]/30 to-[#06182A]/70"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-between px-4 pt-28 pb-10 text-center sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
          <div className="flex max-w-3xl flex-col items-center">
            <h1 className="text-balance text-[34px] font-semibold leading-[1.12] tracking-[-0.025em] text-white drop-shadow-[0_2px_12px_rgba(6,24,42,0.35)] sm:text-[46px] lg:text-[54px]">
              Protegendo o Futuro Agrícola com
              <br />
              Seguro Paramétrico Inteligente.
            </h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/90 drop-shadow-[0_1px_6px_rgba(6,24,42,0.45)] sm:text-[15px]">
              Descubra como a monitorização por satélite garante protecção automática e liquidação transparente para a sua colheita.
            </p>
            <LimeActionLink
              href="/login"
              label="Simular Cobertura"
              className="mt-6 shadow-lg shadow-[#06182A]/25"
            />
          </div>

          {/* Dois cartões translúcidos centrados na base do Hero */}
          <div className="mt-10 flex w-full max-w-[590px] flex-col items-stretch justify-center gap-4 sm:flex-row">
            <a
              href="#solucoes"
              className="flex flex-1 items-center gap-3.5 rounded-[18px] border border-white/30 bg-white/20 p-3 text-left backdrop-blur-md transition-colors hover:bg-white/25 sm:max-w-[350px]"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#1D78C6]">
                <Image
                  src="/images/landing/card-center-crops.jpg"
                  alt="Estação meteorológica e lavra monitorizada pela NOSSA AgroParamétrico"
                  fill
                  sizes="96px"
                  referrerPolicy="no-referrer"
                  className="object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug text-white">
                  Seguro Paramétrico
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/85">
                  Protecção climática automática contra seca e excesso de chuva com dados de satélite verificáveis.
                </p>
              </div>
            </a>

            <a
              href="#sobre"
              className="flex w-full flex-col justify-between rounded-[18px] border border-white/30 bg-white/20 p-4 text-left backdrop-blur-md transition-colors hover:bg-white/25 sm:w-[224px]"
            >
              <SpecialistAvatarStack badgeLabel={`${provincesCount}+`} />
              <div className="mt-4 flex items-end justify-between gap-2">
                <p className="text-[11px] font-medium leading-snug text-white">
                  {provincesCount}+ províncias protegidas em toda Angola
                </p>
                <Sun
                  className="h-5 w-5 shrink-0 text-[#C8F135]"
                  aria-hidden="true"
                />
              </div>
            </a>
          </div>
        </div>
      </section>

      <main>
        {/* Secção 2: Sobre Nós — Texto editorial à esquerda + Retrato e Cartões Sobrepostos à direita */}
        <section
          id="sobre"
          className="scroll-mt-16 bg-white py-20 lg:py-24"
        >
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center rounded-full bg-[#EEF8D6] px-3.5 py-1 text-[11px] font-semibold tracking-wide text-[#3F6212]">
                SOBRE NÓS
              </span>
              <h2 className="mt-4 text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0D1526] sm:text-[36px]">
                A NOSSA AgroParamétrico
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-[#525252] sm:text-[15px]">
                A NOSSA AgroParamétrico é uma plataforma angolana especializada em protecção climática, dedicada a capacitar agricultores e cooperativas com seguro objectivo. Acreditamos no poder da transparência meteorológica para proteger campanhas agrícolas e comunidades rurais.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3.5 text-[12px] font-medium text-[#0D1526]">
                <span className="inline-flex items-center gap-1.5">
                  <Star
                    className="h-4 w-4 fill-[#FACC15] text-[#FACC15]"
                    aria-hidden="true"
                  />
                  <span>Excelente 4.9 / 5</span>
                </span>
                <span className="text-[#D1D5DB]" aria-hidden="true">
                  |
                </span>
                <SpecialistAvatarStack />
                <span className="text-[#525252] tabular-nums">
                  {activeProducts.length} Coberturas Activas
                </span>
              </div>

              <LimeActionLink
                href="#beneficios"
                label="Saber Mais"
                className="mt-7"
              />
            </div>

            <div className="lg:col-span-7">
              <div className="grid items-start gap-5 sm:grid-cols-12">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#1D78C6] sm:col-span-7">
                  <Image
                    src="/images/landing/about-field-inspector.jpg"
                    alt="Especialista de campo angolana com tablet junto a estação agro-meteorológica solar"
                    fill
                    sizes="(max-width: 768px) 100vw, 420px"
                    referrerPolicy="no-referrer"
                    className="object-cover object-top"
                  />
                </div>

                <div className="flex flex-col gap-5 sm:col-span-5 sm:pt-3">
                  <div className="rounded-[20px] border border-[#DCE8F2] bg-[#F1F7FC]/95 p-5 shadow-xs backdrop-blur-md">
                    <p className="flex items-baseline gap-2">
                      <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#0D1526] tabular-nums">
                        85%+
                      </span>
                      <span className="text-[13px] italic text-[#525252]">
                        Completude
                      </span>
                    </p>
                    <p className="mt-3 text-[12px] leading-relaxed text-[#525252]">
                      Cada avaliação exige validação dupla Open-Meteo ERA5 e NASA POWER com integridade mínima garantida antes de qualquer liquidação.
                    </p>
                  </div>

                  <div className="relative z-10 rounded-[20px] border border-[#DCE8F2] bg-[#EAF3FA]/92 p-5 shadow-xs backdrop-blur-md sm:-ml-20 sm:mt-2">
                    <p className="flex items-baseline gap-2">
                      <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#0D1526] tabular-nums">
                        {provincesCount < 10 ? `0${provincesCount}` : provincesCount}+
                      </span>
                      <span className="text-[13px] italic text-[#525252]">
                        Províncias
                      </span>
                    </p>
                    <p className="mt-3 text-[12px] leading-relaxed text-[#525252]">
                      Cobertura preparada para milho, feijão, mandioca e soja nas principais zonas agrícolas de Angola com prémios e pagamentos em Kwanzas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Secção 3: As Nossas Soluções — Fundo claro + 3 cartões fotográficos com botão circular lima no canto */}
        <section
          id="solucoes"
          className="relative scroll-mt-16 overflow-hidden bg-[#F7F8FA] py-20 lg:py-24"
        >
          <Sun
            className="pointer-events-none absolute -top-8 right-8 h-44 w-44 text-[#EBEEF3]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="inline-flex items-center rounded-full bg-[#EEF8D6] px-3.5 py-1 text-[11px] font-semibold tracking-wide text-[#3F6212]">
                  SOLUÇÕES
                </span>
                <h2 className="mt-4 text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0D1526] sm:text-[36px]">
                  As Nossas Soluções Agrícolas
                </h2>
              </div>
              <p className="max-w-sm text-[14px] leading-relaxed text-[#525252]">
                Coberturas paramétricas configuradas por cultura, janela de observação e limiar objectivo em milímetros.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {SOLUTION_CARDS.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  className="group relative block h-[265px] overflow-hidden rounded-[20px] bg-[#0B1324]"
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 390px"
                    referrerPolicy="no-referrer"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061322]/85 via-[#061322]/20 to-transparent"
                  />

                  <div className="absolute right-16 bottom-5 left-5 z-10">
                    <h3 className="text-[17px] font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-white/80 line-clamp-1">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* Recorte de canto inferior direito com botão circular lima igual ao design */}
                  <div className="absolute right-0 bottom-0 z-10 flex h-14 w-14 items-center justify-center rounded-tl-[20px] bg-[#F7F8FA]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8F135] text-[#0D1526] transition-transform duration-200 group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <LimeActionLink
                href="#beneficios"
                label="Ver Produtos e Regras"
              />
            </div>
          </div>
        </section>

        {/* Secção 4: Benefícios, Produtos Activos, Escala de Severidade e Acesso aos 3 Portais na Mesma Página */}
        <section
          id="beneficios"
          className="scroll-mt-16 bg-white py-20 lg:py-24"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <span className="inline-flex items-center rounded-full bg-[#EEF8D6] px-3.5 py-1 text-[11px] font-semibold tracking-wide text-[#3F6212]">
                  BENEFÍCIOS &amp; REGRAS
                </span>
                <h2 className="mt-4 text-balance text-[28px] font-semibold leading-[1.18] tracking-[-0.025em] text-[#0D1526] sm:text-[34px]">
                  Como Funciona a Protecção Paramétrica
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-[#525252]">
                  Sem peritagens presenciais lentas: cada apólice responde directamente ao volume acumulado de chuva registado nas coordenadas da propriedade.
                </p>

                <div className="mt-8 space-y-5 border-t border-[#E5E7EB] pt-6">
                  {MECHANISM_STEPS.map((item) => (
                    <div key={item.step} className="flex gap-3.5">
                      <span className="font-mono text-xs font-semibold text-[#3F6212] tabular-nums pt-0.5">
                        {item.step}
                      </span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#0D1526]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8 lg:col-span-7">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#0D1526]">
                    Produtos Paramétricos Disponíveis ({activeProducts.length})
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {activeProducts.map((product) => {
                      const cropNames = crops
                        .filter((c) => product.supportedCropIds.includes(c.id))
                        .map((c) => c.name)
                        .join(' · ')

                      return (
                        <div
                          key={product.id}
                          className="flex flex-col justify-between rounded-[18px] border border-[#E5E7EB] bg-[#FAFAFA] p-5"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#6B7280]">
                              <span className="font-mono">{product.code}</span>
                              <span>
                                {product.coverageType === 'drought'
                                  ? 'Défice Hídrico'
                                  : 'Excesso de Chuva'}
                              </span>
                            </div>
                            <h4 className="mt-2 text-[15px] font-semibold text-[#0D1526]">
                              {product.name}
                            </h4>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-[#525252]">
                              {product.description}
                            </p>
                          </div>

                          <div className="mt-4 space-y-1.5 border-t border-[#E5E7EB] pt-3 text-[12px]">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#6B7280]">Gatilho</span>
                              <span className="font-mono font-semibold text-[#0D1526] tabular-nums">
                                {product.coverageType === 'drought' ? '< ' : '> '}
                                {product.triggerThresholdMm} mm /{' '}
                                {product.observationWindowDays}d
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#6B7280]">Capital</span>
                              <span className="font-mono text-[#0D1526] tabular-nums">
                                {formatAOA(product.minCapitalAoa)} –{' '}
                                {formatAOA(product.maxCapitalAoa)}
                              </span>
                            </div>
                            <p className="pt-1 text-[11px] text-[#6B7280] truncate">
                              Culturas: {cropNames}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[18px] border border-[#E5E7EB]">
                  <div className="border-b border-[#E5E7EB] bg-[#F7F8FA] px-5 py-3.5">
                    <h3 className="text-[14px] font-semibold text-[#0D1526]">
                      Tabela de Severidade e Liquidação Automática
                    </h3>
                  </div>
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-[#E5E7EB] bg-white text-[11px] font-medium text-[#6B7280]">
                      <tr>
                        <th className="px-5 py-2.5">Classificação</th>
                        <th className="px-5 py-2.5">Desvio face ao Gatilho</th>
                        <th className="px-5 py-2.5 text-right">Indemnização</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {SEVERITY_SCALE.map((row) => (
                        <tr key={row.tier}>
                          <td className="px-5 py-2.5 font-medium text-[#0D1526]">
                            {row.tier}
                          </td>
                          <td className="px-5 py-2.5 font-mono text-[12px] text-[#525252] tabular-nums">
                            {row.deviation}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono font-semibold text-[#0D1526] tabular-nums">
                            {row.payout}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Acesso dedicado aos 3 portais */}
            <div className="mt-16 border-t border-[#E5E7EB] pt-12">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#0D1526]">
                    Portais Dedicados por Perfil
                  </h3>
                  <p className="mt-1 text-[13px] text-[#525252]">
                    Cada perfil dispõe de rota e ecrã de autenticação isolados.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {PORTALS.map((portal) => (
                  <div
                    key={portal.href}
                    className="flex flex-col justify-between rounded-[18px] border border-[#E5E7EB] bg-[#F7F8FA] p-5"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-[#525252]">
                        {portal.role}
                      </p>
                      <h4 className="mt-1 text-[16px] font-semibold text-[#0D1526]">
                        {portal.title}
                      </h4>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
                        {portal.description}
                      </p>
                    </div>
                    <div className="mt-5">
                      <Link
                        href={portal.href}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0D1526] hover:underline underline-offset-4"
                      >
                        <span>{portal.cta}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
