# Auditoria Imutável (`AUDIT.md`)

## 1. Princípio de Imutabilidade

Em conformidade com boas práticas regulatórias de seguros (ARSEG / NOSSA Seguros), **nenhuma acção crítica altera ou elimina registos anteriores de auditoria**. Não existem endpoints HTTP `PATCH` ou `DELETE` para `/api/admin/audit`, e as políticas RLS em `supabase/migrations/002_rls_policies.sql` permitem apenas `SELECT` aos perfis `manager` e `operator`.

## 2. Eventos Auditados (`services/audit/audit-service.ts`)

`recordAuditLog()` é invocada obrigatoriamente nas seguintes operações:
- Autenticação (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_REGISTERED`) e actualização de perfil (`PROFILE_UPDATED`).
- Gestão de propriedades (`FARM_CREATED`, `FARM_UPDATED`, `FARM_DELETED`).
- Gestão de produtos (`PRODUCT_CREATED`, `PRODUCT_VERSION_CREATED`).
- Motor de subscrição (`SIMULATION_CREATED`, `POLICY_CREATED`, `POLICY_PDF_GENERATED`).
- Motor climático e monitorização (`CLIMATE_FETCH_EXTERNAL`, `CLIMATE_COMPARISON_EXECUTED`, `MONITORING_CYCLE_EXECUTED`, `DUPLICATE_EVENT_BLOCKED`).
- Cálculo e pagamento (`INDEMNITY_CALCULATED`, `PREMIUM_PAYMENT_SIMULATED_SUCCESS`, `INDEMNITY_PAYMENT_SIMULATED_SUCCESS`, `PAYMENT_SIMULATED_FAILURE`).
- Intervenção humana (`EXCEPTION_DECISION_APPROVE`, `EXCEPTION_DECISION_REJECT`, `EXCEPTION_DECISION_ESCALATE`, `SETTINGS_UPDATED`).

## 3. Estrutura do Registo (`AuditLogEntry`)

Cada entrada contém:
- `userId`, `userEmail`, `userRole` (ou `'system'` para cron)
- `action`, `entityType`, `entityId`
- `previousState` e `newState` (instantâneos JSON antes/depois)
- `metadata` (sem segredos ou tokens sensíveis)
- `result`: `'success' | 'failure' | 'blocked'`
- `timestamp` (UTC ISO-8601)

## 4. Consulta na Interface

Disponível em `/admin/audit` (Gestor) e `/operations/audit` (Operador) através do componente `AuditLogTable` com filtragem em tempo real por acção, entidade ou e-mail do responsável.
