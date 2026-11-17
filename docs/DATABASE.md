# Base de Dados e Migrações — NOSSA AgroParamétrico

O esquema relacional foi concebido para **PostgreSQL 15+ com extensão PostGIS** no Supabase, organizado por domínios e versionado exclusivamente através de migrações SQL em `supabase/migrations/`.

Todas as rotas da API (`/app/api/**`) e todas as páginas SSR (`/app/**`) consomem o repositório central `lib/repositories/platform-repository.ts`, que opera directamente contra o **Supabase PostgreSQL** assim que as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas.

---

## 1. Domínios e Tabelas Implementadas (`001_initial_schema.sql`)

### Identidade e Utilizadores
- `profiles` — Dados base do utilizador ligados a `auth.users(id)`.
- `user_roles` — Associação explícita de papéis (`farmer`, `manager`, `operator`) com restrição `unique (user_id, role)`.
- `customers` — Registo de produtores segurados com NIF único, província, município, categoria (`smallholder`, `medium_producer`, `cooperative`) e estado KYC.

### Agricultura e Geografia
- `crops` — Culturas agrícolas suportadas (`MILHO`, `FEIJAO`, `MANDIOCA`, `SOJA`), multiplicador de risco e ciclo em dias.
- `agricultural_campaigns` — Campanhas agrícolas (ex.: `CAMP-2026-CHUVAS`) com datas e multiplicador sazonal.
- `farms` — Propriedades agrícolas associadas ao cliente e cultura principal (`area_hectares > 0`).
- `farm_locations` — Localização geográfica com restrição territorial para Angola (`latitude between -18.2 and -4.2`, `longitude between 11.4 and 24.2`) e coluna espacial `geography(Point, 4326)`.

### Produtos, Simulações e Apólices
- `insurance_products` — Catálogo de produtos paramétricos (`drought` / `excess_rain`).
- `insurance_product_versions` — Versões imutáveis de cada produto (`version_number`, `trigger_threshold_mm`, `observation_window_days`, `severity_bands` em `jsonb`, taxas e capitais mínimo/máximo).
- `insurance_coverages` e `insurance_rules` — Metadados de indicadores e expressões de regras por versão.
- `insurance_simulations` — Cotações calculadas no servidor com `breakdown` completo em JSONB.
- `policies` — Apólices emitidas (`draft`, `pending_payment`, `active`, `expired`, `cancelled`).
- `policy_terms` — Instantâneo imutável das cláusulas no instante da contratação.

### Dados Climáticos e Qualidade
- `climate_providers` — Registo de provedores activos e planeados.
- `climate_data_imports` — Lotes de importação com URL da consulta e contagem de registos.
- `climate_observations` — Série diária em `mm` (`precipitation_mm` anulável para preservar dados em falta como `NULL`), com unicidade `(provider_code, latitude, longitude, observation_date)`.
- `climate_data_quality_checks` — Registo de validações de completude e anomalias.
- `climate_source_comparisons` — Comparação cruzada entre fonte primária e secundária.

### Eventos, Excepções e Indemnizações
- `climate_events` — Eventos avaliados por janela e apólice, protegidos por chave única determinística `event_key`.
- `event_evidence` — Evidências brutas ligadas ao evento.
- `indemnity_calculations` — Memória de cálculo ligada de forma única (`unique(event_id)`), com restrição `calculated_indemnity_aoa <= insured_capital_aoa`.
- `operational_exceptions` — Bloqueios para análise humana do Operador.
- `event_decisions` — Decisões manuais (`approve`, `reject`, `escalate`) com justificação obrigatória.

### Pagamentos, Notificações, Auditoria e Controlo
- `payments` — Transacções simuladas com `idempotency_key` única e `transaction_reference` única.
- `payment_transactions` — Log detalhado de interacções do gateway simulado.
- `notifications` — Alertas segmentados por utilizador ou perfil.
- `audit_logs` — Registo histórico append-only sem políticas RLS de `UPDATE` ou `DELETE`.
- `system_settings` — Parâmetros globais operacionais (`default_disagreement_threshold_percent`, `default_min_completeness_percent`, etc.).
- `security_rate_limits` *(criada em `003_security_concurrency_and_sequences.sql`)* — Contadores distribuídos de limitação de taxa e anti-força-bruta.

---

## 2. Segurança de Dados (RLS — `002_rls_policies.sql`)

Todas as **27 tabelas operacionais** (incluindo `profiles`, `user_roles`, `customers`, `farms`, `policies`, `climate_events`, `operational_exceptions`, `payments`, `audit_logs`, `system_settings` e `security_rate_limits`) têm `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` activado com políticas explícitas:
- Escritas privilegiadas de negócio (emissão de apólices, cálculos de indemnização, decisões operacionais, pagamentos e auditoria) são executadas exclusivamente no servidor via `SUPABASE_SERVICE_ROLE_KEY`.
- Utilizadores autenticados apenas acedem aos seus próprios registos (Agricultores) ou às vistas de supervisão autorizadas por papel (`manager` / `operator`).
- `audit_logs` e `security_rate_limits` não permitem `UPDATE`/`DELETE` por utilizadores comuns.

---

## 3. Concorrência, Sequências e Integridade (`003_security_concurrency_and_sequences.sql`)

- **`public.policy_number_seq` + RPC `next_policy_number(p_year)`**: geração atómica de números de apólice (`NS-AGRO-YYYY-NNNN`) sem risco de colisão em emissões paralelas.
- **Índice único parcial `idx_policies_unique_active_simulation`**: impede emissão dupla concorrente de apólices a partir da mesma simulação (`WHERE simulation_id IS NOT NULL AND status <> 'cancelled'`).
- **Trigger `trg_lock_terminal_operational_exception` + RPC `resolve_operational_exception(...)`**: bloqueia a nível de linha (`SELECT ... FOR UPDATE`) e de trigger qualquer tentativa de reabrir ou alterar uma excepção já encerrada (`approved` ou `rejected`), devolvendo conflito HTTP `409`.
- **RPC `check_and_increment_rate_limit(...)`**: contador atómico distribuído em PostgreSQL com janela deslizante para travar força bruta mesmo entre várias instâncias serverless.

---

## 4. Ordem Exacta de Execução no Supabase

Execute os scripts no **SQL Editor** do Supabase (ou via `supabase db push`) **exactamente por esta ordem**:

1. `supabase/migrations/001_initial_schema.sql` — Cria extensões (`pgcrypto`, `postgis`), tabelas, chaves estrangeiras e índices base.
2. `supabase/migrations/002_rls_policies.sql` — Activa RLS em todas as tabelas e cria funções auxiliares (`current_user_role`, `current_customer_id`, etc.) e políticas de isolamento.
3. `supabase/migrations/003_security_concurrency_and_sequences.sql` — Cria sequências atómicas de apólices, rate limiting distribuído, locks de concorrência em excepções e índices únicos parciais.
4. `supabase/seed.sql` — Popula o catálogo inicial (culturas de Angola, campanhas, produtos paramétricos versionados, provedores climáticos e `system_settings`).
