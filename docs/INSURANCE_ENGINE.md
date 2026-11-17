# Motor de Seguro Paramétrico (`INSURANCE_ENGINE.md`)

## 1. Versionamento de Produtos (`insurance_product_versions`)

Os produtos configurados pelo Gestor em `/admin/products` nunca sobrescrevem regras históricas destrutivamente. Ao editar limites, taxas, gatilhos ou faixas de severidade via `PATCH /api/products/[id]`, o motor incrementa `activeVersionNumber` e gera uma nova versão imutável.

## 2. Congelamento Contratual na Subscrição (`policy_terms`)

No instante em que o agricultor aceita as condições e emite a apólice (`POST /api/policies`):
- Todos os parâmetros críticos (`coverageType`, `triggerThresholdMm`, `observationWindowDays`, `minDataCompletenessPercent`, `maxSourceDisagreementPercent`, `severityBands`) são copiados para `policy.contractTerms`.
- Todos os motores subsequentes (`evaluateParametricTrigger`, `calculateIndemnity`, `generatePolicyPdf`) leem exclusivamente `policy.contractTerms`, garantindo segurança jurídica ao segurado e auditabilidade.

## 3. Ciclo de Vida da Apólice e dos Eventos

- **Apólice:** `draft` → `pending_payment` → `active` (ou `expired` / `cancelled`).
- **Evento Climático:** `monitoring` → `data_validation_pending` → (`trigger_not_activated` | `trigger_activated` → `indemnity_calculated` → `payment_pending` → `paid`) ou (`exception` → `manual_review` → `indemnity_calculated` | `rejected`).

## 4. Geração de Certificado PDF (`services/policies/pdf-generator.ts`)

Utiliza **pdf-lib** em memória no servidor para gerar um documento PDF padronizado (A4) contendo:
- Faixa explícita de **CERTIFICADO DE DEMONSTRAÇÃO SIMULADA** (sem valor jurídico real).
- Número único da apólice, dados do produtor, NIF, propriedade, coordenadas GPS, cultura e campanha.
- Capital segurado e prémio em Kwanzas (AOA), gatilho em mm e tabela completa das faixas de severidade congeladas.
