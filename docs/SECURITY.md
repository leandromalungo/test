# Segurança e Controlo de Acesso — NOSSA AgroParamétrico

Este documento descreve as camadas de segurança implementadas no servidor, na base de dados e nos cabeçalhos HTTP.

---

## 1. Isolamento Total de Portais e Login (`RBAC`)

Cada perfil possui **ecran de login dedicado** e **endpoint de autenticação isolado**, sem partilha de componentes de login:

| Perfil | Ecran de Login | Endpoint Exclusivo | Portal Protegido |
| --- | --- | --- | --- |
| **Agricultor** | `/login` | `POST /api/auth/farmer/login` | `/dashboard/**` |
| **Gestor NOSSA Seguros** | `/admin/login` | `POST /api/auth/manager/login` | `/admin/**` |
| **Operador de Qualidade** | `/operations/login` | `POST /api/auth/operator/login` | `/operations/**` |

- Um utilizador com papel `farmer` recebe `401` ao tentar autenticar-se em `/api/auth/manager/login` ou `/api/auth/operator/login` (e vice-versa).
- Os payloads de autenticação e criação usam `zod.strict()` — qualquer tentativa de injectar `role`, `id` ou campos extra no JSON é rejeitada com `400`.
- O cookie de sessão `nossa_agro_session` é `httpOnly`, `sameSite=lax`, `secure` em produção, e assinado com HMAC-SHA256 (`SESSION_SECRET`).

---

## 2. Protecção CSRF, Validação de Conteúdo e Cabeçalhos HTTP

Todas as rotas mutantes (`POST`, `PATCH`, `PUT`, `DELETE`) aplicam `lib/security/request-security.ts`:

- **Protecção CSRF (`enforceCsrfProtection`)**:
  - Rejeita (`403`) qualquer pedido com `Sec-Fetch-Site: cross-site`.
  - Valida correspondência exacta entre `Origin` (ou `Referer`) e o `Host` / `X-Forwarded-Host` do servidor.
- **Content-Type estrito (`enforceJsonContentType`)**:
  - Exige `Content-Type: application/json` (`415` caso contrário) em todas as APIs JSON mutantes.
- **Cabeçalhos de Segurança (`next.config.mjs` e `NO_STORE_SECURITY_HEADERS`)**:
  - Todas as respostas de `/api/**` incluem `Cache-Control: no-store, no-cache, must-revalidate, private`, `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY`.
  - O portal aplica Content Security Policy (CSP), `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy`.

---

## 3. Rate Limiting e Bloqueio Anti-Força-Bruta Distribuídos

Implementado em `lib/security/rate-limit.ts` + `check_and_increment_rate_limit` (`003_security_concurrency_and_sequences.sql`):

- **Em Produção (Supabase configurado)**: o contador reside numa tabela PostgreSQL dedicada (`security_rate_limits`) actualizada atomicamente via RPC com `SUPABASE_SERVICE_ROLE_KEY`. Funciona de forma partilhada entre múltiplas instâncias/containers serverless e sobrevive a reinícios.
- **Chaves de protecção**: aplicadas por IP e por conta (`email`) nos endpoints de login, registo, simulação, pagamentos, monitorização e decisões operacionais, respondendo com `429 Too Many Requests` e cabeçalho `Retry-After`.
- **Em Modo Demonstração/Testes**: fallback automático em memória para execução sem base de dados externa.

---

## 4. Protecção do Endpoint de Cron (`/api/monitoring/run`)

- Aceita token via cabeçalho `x-cron-secret` ou `Authorization: Bearer <token>`.
- A comparação com `process.env.CRON_SECRET` utiliza `timingSafeSecretMatch` (`crypto.timingSafeEqual` sobre digest SHA-256), eliminando ataques de temporização.
- Um cabeçalho `Authorization: Bearer` inválido devolve imediatamente `401` (nunca faz fallback silencioso para sessão de browser).
- Pedidos via sessão de browser (`manager`) exigem verificação CSRF `enforceCsrfProtection`.

---

## 5. Segurança de Base de Dados (RLS) e Concorrência

- **Row Level Security (RLS)** activo nas **27 tabelas** em `002_rls_policies.sql`.
- **Auditoria Imutável**: `audit_logs` permite apenas inserção pelo servidor privilegiado e leitura por `manager`/`operator`; não existem políticas `UPDATE` nem `DELETE`.
- **Excepções Operacionais Terminais**: `operational_exceptions` bloqueia reabertura ou dupla decisão após `approved`/`rejected` via trigger na BD + `SELECT ... FOR UPDATE` (`resolve_operational_exception`), retornando HTTP `409 Conflict`.
- **Numeração Atómica de Apólices**: sequência PostgreSQL `policy_number_seq` + índice único parcial por simulação impedem colisões de numeração ou emissão duplicada em pedidos simultâneos.
- **Segredos estritos**: em produção (`NODE_ENV === 'production'`), a ausência de `SESSION_SECRET` válido (>= 32 caracteres) impede assinatura insegura; `SUPABASE_SERVICE_ROLE_KEY` nunca é exposta ao browser.
