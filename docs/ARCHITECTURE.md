# Arquitectura do Sistema — NOSSA AgroParamétrico

## 1. Visão Geral Arquitectural

A aplicação segue uma arquitectura modular **monolítica estruturada em Next.js 16 (App Router)** com separação estrita entre apresentação (Server/Client Components), camada HTTP (`/api/**`), serviços de domínio (`services/**`), validação (`lib/validation/**`), segurança (`lib/auth/**`, `lib/security/**`) e camada de persistência (Supabase PostgreSQL / Modo Demonstração).

```text
Navegador (Agricultor / Gestor / Operador)
   │
   ▼ HTTPS / Cookies HttpOnly
Next.js App Router
   ├── Páginas Públicas & Portais (Server Components por omissão)
   │      ├── /                    (Landing pública)
   │      ├── /dashboard/**        (Portal do Agricultor - role: farmer)
   │      ├── /admin/**            (Portal Gestor NOSSA - role: manager)
   │      └── /operations/**       (Portal Operador - role: operator)
   │
   └── Route Handlers REST (/app/api/**)
          ├── Validação de schema (Zod) + RBAC + Rate Limit
          ▼
   Camada de Serviços de Domínio (/services/**)
          ├── premium/premium-engine.ts        (Decimal.js)
          ├── climate/providers/*              (Open-Meteo, NASA POWER, futuros)
          ├── climate/validation.ts            (Qualidade e completude)
          ├── climate/comparison.ts            (Cruzamento multi-fonte)
          ├── triggers/trigger-engine.ts       (Avaliação de gatilhos + anti-duplicação)
          ├── indemnities/indemnity-engine.ts  (Faixas de severidade + tecto)
          ├── monitoring/monitoring-engine.ts  (Orquestração diária/manual)
          ├── payments/payment-service.ts      (Simulação idempotente)
          ├── policies/pdf-generator.ts        (Certificado PDF via pdf-lib)
          ├── risk/basis-risk-service.ts       (Análise histórica multi-ano)
          └── audit/audit-service.ts           (Registo imutável)
          │
          ▼
   Persistência Dual (Produção vs Demonstração)
          ├── Supabase PostgreSQL + PostGIS + RLS (quando configurado)
          └── Store local JSON em /tmp/nossa-agro-demo-db-v1.json (Demo Mode)
```

## 2. Estrutura de Pastas

- `app/` — Rotas Next.js, layouts protegidos por portal e Route Handlers `/api/*`.
- `components/ui/` — Primitivas reutilizáveis (`button.tsx`, `field.tsx`, `status-badge.tsx`, `empty-state.tsx`).
- `components/layout/` — `PublicNavbar`, `PublicFooter` e `PortalShell`.
- `components/features/` — Componentes funcionais isolados por domínio (`auth`, `climate`, `farms`, `insurance`, `policies`, `farmer`, `admin`, `operations`, `shared`).
- `services/` — Toda a lógica de negócio testável de forma independente do HTTP e da UI.
- `lib/` — Clientes Supabase (`client.ts`, `server.ts`), autenticação, guards, schemas Zod, rate limiter e store de demonstração.
- `config/angola.ts` — Constantes geográficas de Angola (10 províncias, caixa delimitadora `ANGOLA_BOUNDS`, formatadores `AOA` e `mm`).
- `types/domain.ts` — Tipos TypeScript partilhados e alinhados com o esquema SQL.
- `supabase/` — Migrações versionadas (`001_initial_schema.sql`, `002_rls_policies.sql`) e `seed.sql`.

## 3. Decisões Arquitecturais Chave

1. **Cálculos Exclusivos no Servidor:** Nenhum prémio ou indemnização é calculado ou confiado a partir do cliente. O navegador envia apenas identificadores (`farmId`, `productId`, `insuredCapitalAoa`) e recebe o cálculo oficial auditado pelo servidor.
2. **Imutabilidade Contratual na Apólice:** Quando uma apólice é contratada, os parâmetros da versão do produto (`triggerThresholdMm`, `severityBands`, `minDataCompletenessPercent`, `maxSourceDisagreementPercent`) são copiados para `policy_terms` / `contractTerms`. Alterações futuras ao produto pelo Gestor não afectam apólices vigentes.
3. **Separação Real vs Simulado:** Séries meteorológicas externas reais têm `isSimulatedData: false` e URL de origem real; dados pré-carregados ou cenários de falha têm `isSimulatedData: true`. Pagamentos têm `isSimulated: true`.
4. **PDF 100% JavaScript (`pdf-lib`):** Escolhido em vez de bibliotecas dependentes de ficheiros `.afm` ou binários nativos (como `pdfkit` ou `puppeteer`), garantindo execução fiável em builds `output: 'standalone'` da Next.js.
