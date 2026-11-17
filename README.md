# NOSSA AgroParamétrico — Plataforma de Seguro Agrícola Paramétrico (Angola)

Plataforma digital **pronta para produção** para subscrição, monitorização climática via satélite/reanálise e liquidação auditável de seguros agrícolas paramétricos orientada ao mercado angolano (moeda **AOA — Kwanza Angolano**), desenvolvida para a **NOSSA Seguros**.

---

## Problema que a Plataforma Resolve

Os pequenos e médios produtores rurais em Angola enfrentam elevada exposição a choques climáticos (secas severas no Cunene/Huíla/Benguela e chuvas excessivas no Planalto Central/Norte). O seguro agrícola tradicional exige peritagens físicas presenciais caras e morosas, inviabilizando a cobertura acessível.

O **seguro paramétrico** substitui a peritagem presencial por **índices meteorológicos objectivos** (precipitação acumulada em milímetros numa janela contratual). Quando os dados validados por fontes independentes ultrapassam o gatilho definido na apólice, a indemnização é apurada automaticamente com total transparência e rastreabilidade.

> **Aviso de Transparência e Risco de Base:** Um gatilho paramétrico baseia-se exclusivamente no índice climático contratado e **não garante indemnização para todas as perdas agrícolas reais** (ver [Risco de Base](docs/BASIS_RISK.md)). Os fluxos de pagamento no MVP decorrem em modo simulado auditável até ligação a gateway EMIS/Multicaixa real.

---

## Funcionalidades e Arquitectura de Produção

- **Três Portais e Telas de Login Isoladas por Perfil (RBAC):**
  - **Agricultor (`/login` → `/dashboard/**`)**: registo próprio com NIF, gestão de propriedades georreferenciadas em Angola, simulador de cobertura paramétrica, emissão atómica de apólices (`NS-AGRO-YYYY-NNNN`), certificado PDF (`pdf-lib`), acompanhamento climático e histórico de indemnizações.
  - **Gestor NOSSA Seguros (`/admin/login` → `/admin/**`)**: gestão de produtos paramétricos versionados, carteira global de clientes/apólices, execução do motor de monitorização climática, análise de exposição geográfica, testes históricos de risco de base, relatórios CSV e auditoria.
  - **Operador de Operações & Qualidade (`/operations/login` → `/operations/**`)**: investigação de excepções operacionais (dados em falta, discordância entre fontes climáticas), validação cruzada multi-fonte e decisões manuais protegidas contra reabertura e condições de corrida.
- **Ligação Integral ao Supabase PostgreSQL (`lib/repositories/platform-repository.ts`):**
  - Todas as rotas da API (`/app/api/**`) e todas as páginas SSR (`/app/**`) leem e escrevem directamente no **Supabase PostgreSQL** assim que as variáveis de ambiente são preenchidas (recorrendo a dados de demonstração apenas quando as chaves ainda não estão configuradas).
- **Integrações Climáticas Externas Reais:**
  - **Open-Meteo Archive (ERA5 / ERA5-Land)** — fonte primária em tempo real por latitude/longitude.
  - **NASA POWER Daily (`PRECTOTCORR`)** — segunda fonte independente de confirmação cruzada.
- **Segurança & Integridade de Grau de Produção:**
  - **RLS completo** nas **27 tabelas** do Supabase (`002_rls_policies.sql`).
  - **Rate Limiting e Anti-Força-Bruta distribuídos** via função atómica PostgreSQL (`check_and_increment_rate_limit`).
  - **Protecção CSRF** (`Origin` / `Referer` / `Sec-Fetch-Site`) e validação estrita `Content-Type: application/json` + `zod.strict()` em todas as APIs mutantes.
  - **Concorrência segura**: numeração sequencial atómica de apólices (`policy_number_seq`), índice único parcial por simulação e bloqueio terminal de excepções com `SELECT ... FOR UPDATE`.
  - **Aritmética decimal rigorosa (`decimal.js`)**, dados climáticos em falta preservados como `null` (nunca convertidos em `0 mm`), auditoria imutável (`audit_logs`) e verificação de estado em `/api/health`.

---

## Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| Framework Full-Stack | Next.js 16.4.3 (App Router, Server & Client Components) |
| Linguagem & Validação | TypeScript 5.7 (strict) + Zod 4 |
| Interface & Estilo | Tailwind CSS v4, Lucide Icons, TanStack Table, Recharts |
| Precisão Financeira | `decimal.js` |
| Geração de Apólices PDF | `pdf-lib` (100% JS/TS compatível com standalone bundling) |
| Base de Dados & Auth | Supabase (PostgreSQL 15+ + PostGIS + Auth + RLS + RPCs) |
| Testes Automatizados | Vitest 5 |

---

## Como Ligar a Sua Base de Dados Supabase (3 Passos)

### 1. Instalar dependências e criar `.env.local`
```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as chaves do seu projecto Supabase (veja o guia detalhado em [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)):
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
SESSION_SECRET=chave-aleatoria-64-caracteres-hex
CRON_SECRET=token-aleatorio-64-caracteres-hex
OPEN_METEO_ARCHIVE_URL=https://archive-api.open-meteo.com/v1/archive
NASA_POWER_DAILY_URL=https://power.larc.nasa.gov/api/temporal/daily/point
```

### 2. Executar as Migrações SQL no Supabase (por ordem exacta)
No **SQL Editor** do Supabase (ou via `supabase db push`), execute:

1. `supabase/migrations/001_initial_schema.sql` — Estrutura de tabelas, PostGIS e índices.
2. `supabase/migrations/002_rls_policies.sql` — Row Level Security (RLS) nas 27 tabelas.
3. `supabase/migrations/003_security_concurrency_and_sequences.sql` — Sequência atómica de apólices, rate limiting distribuído e bloqueio de concorrência em excepções.
4. `supabase/seed.sql` — Culturas de Angola, campanhas, produtos paramétricos iniciais, provedores e configurações.

### 3. Criar Contas de Gestor e Operador + Testar Ligação
- Crie os utilizadores iniciais de **Gestor** (`manager`) e **Operador** (`operator`) em *Authentication → Users* no Supabase e insira os papéis em `public.profiles` e `public.user_roles` (ver SQL pronto em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- Arranque o servidor (`npm run dev`) e confirme a ligação em `http://localhost:3000/api/health`.

---

## Portais de Acesso

| Perfil | Tela de Login Exclusiva | Portal de Destino | Credencial Demo (apenas sem Supabase) |
| --- | --- | --- | --- |
| **Agricultor** | `/login` | `/dashboard` | `agricultor@nossa.demo.ao` / `Demo@2026` |
| **Gestor (NOSSA Seguros)** | `/admin/login` | `/admin` | `gestor@nossa.demo.ao` / `Demo@2026` |
| **Operador (Qualidade & Excepções)** | `/operations/login` | `/operations` | `operador@nossa.demo.ao` / `Demo@2026` |

---

## Comandos de Desenvolvimento, Verificação e Testes

```bash
# Servidor de desenvolvimento (porta 3000)
npm run dev

# Verificação de tipos TypeScript e lint
npm run lint

# Testes unitários e de segurança automatizados (Vitest)
npm test

# Build de produção
npm run build
npm start
```

---

## Índice da Documentação Técnica (`/docs`)

- [Índice Geral da Documentação](docs/README.md)
- [Arquitectura do Sistema](docs/ARCHITECTURE.md)
- [Base de Dados e Migrações](docs/DATABASE.md)
- [Referência da API REST](docs/API.md)
- [Autenticação e Sessões](docs/AUTHENTICATION.md)
- [Segurança e Controlo de Acesso (RLS)](docs/SECURITY.md)
- [Regras de Negócio e Fórmulas (AOA)](docs/BUSINESS_RULES.md)
- [Motor de Seguro Paramétrico](docs/INSURANCE_ENGINE.md)
- [Integração de Dados Climáticos](docs/CLIMATE_DATA.md)
- [Qualidade de Dados e Validação](docs/DATA_QUALITY.md)
- [Risco de Base e Simulação Histórica](docs/BASIS_RISK.md)
- [Pagamentos Simulados e Idempotência](docs/PAYMENTS.md)
- [Auditoria Imutável](docs/AUDIT.md)
- [Estratégia de Testes](docs/TESTING.md)
- [Guia de Implantação em Produção](docs/DEPLOYMENT.md)
- [Variáveis de Ambiente](docs/ENVIRONMENT.md)
- [Licenças e Dependências](docs/LICENSES_AND_DEPENDENCIES.md)
- [Roadmap Evolutivo](docs/ROADMAP.md)
