# Referência da API REST (`/api/**`)

Todos os Route Handlers validam entrada com **Zod**, verificam autenticação e papel no servidor e delegam a lógica nos serviços em `services/**`. Erros devolvem JSON estruturado `{ "error": "Mensagem clara" }` com códigos HTTP adequados (`400`, `401`, `403`, `404`, `429`, `500`).

## 1. Autenticação e Perfil

| Método | Rota | Papel | Descrição |
| --- | --- | --- | --- |
| `POST` | `/api/auth/farmer/login` | Público (só `farmer`) | Autenticação exclusiva do Agricultor com bloqueio anti-força-bruta e CSRF. |
| `POST` | `/api/auth/manager/login` | Público (só `manager`) | Autenticação exclusiva do Gestor NOSSA Seguros (`401` para outros perfis). |
| `POST` | `/api/auth/operator/login` | Público (só `operator`) | Autenticação exclusiva do Operador de Qualidade (`401` para outros perfis). |
| `POST` | `/api/auth/login` | Desactivado (`403`) | Endpoint unificado desactivado por segurança de isolamento. |
| `POST` | `/api/auth/register` | Público | Regista novo agricultor fictício/real com NIF e cria perfil + cliente. |
| `POST` | `/api/auth/logout` | Autenticado | Encerra sessão Supabase e remove cookie de sessão demo. |
| `GET` | `/api/auth/session` | Opcional | Devolve utilizador actual e `authMode` (`supabase` ou `demonstration`). |
| `GET` | `/api/profile` | Autenticado | Obtém dados do perfil do utilizador autenticado. |
| `PATCH` | `/api/profile` | Autenticado | Actualiza telefone, província e município com registo em auditoria. |

## 2. Catálogo, Propriedades e Produtos

| Método | Rota | Papel | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/catalog` | Público | Lista culturas, campanhas activas, produtos e províncias de Angola. |
| `GET` | `/api/farms` | Autenticado | Lista propriedades do próprio agricultor (ou todas para `manager`/`operator`). |
| `POST` | `/api/farms` | `farmer` | Regista propriedade agrícola validando coordenadas dentro de Angola. |
| `GET` / `PATCH` / `DELETE` | `/api/farms/[id]` | Dono / `manager` | Consulta, actualiza ou remove propriedade (bloqueia se houver apólices). |
| `GET` | `/api/products` | Público | Lista produtos paramétricos configurados. |
| `POST` | `/api/products` | `manager` | Cria novo produto paramétrico e versão v1 com faixas de severidade. |
| `GET` / `PATCH` | `/api/products/[id]` | Público (`GET`) / `manager` (`PATCH`) | Consulta produto ou gera nova versão imutável (`version_number + 1`). |

## 3. Simulações e Apólices

| Método | Rota | Papel | Descrição |
| --- | --- | --- | --- |
| `POST` | `/api/insurance/simulate` | `farmer`, `manager` | Calcula prémio no servidor com `Decimal.js` e grava `InsuranceSimulation`. |
| `GET` | `/api/insurance/simulations` | Autenticado | Lista simulações do agricultor (ou todas para gestor). |
| `GET` | `/api/policies` | Autenticado | Lista apólices filtradas pelo utilizador (ou carteira global para gestor/operador). |
| `POST` | `/api/policies` | `farmer`, `manager` | Contrata apólice exigindo `acceptTerms: true` e copiando `contractTerms`. |
| `GET` | `/api/policies/[id]` | Dono / `manager` / `operator` | Detalhe completo da apólice com verificação estrita de posse. |
| `GET` | `/api/policies/[id]/document` | Dono / `manager` / `operator` | Gera e devolve `application/pdf` via `pdf-lib` com aviso de demonstração. |

### Exemplo: `POST /api/insurance/simulate`

```json
// Request
{
  "farmId": "farm-01",
  "cropId": "crop-milho",
  "campaignId": "camp-2026-chuvas",
  "productId": "prod-seca-milho",
  "insuredCapitalAoa": 2000000
}

// Response 201
{
  "simulation": {
    "id": "sim-...",
    "estimatedPremiumAoa": 126000,
    "triggerThresholdMm": 80,
    "observationWindowDays": 30,
    "maxPossibleIndemnityAoa": 2000000
  }
}
```

## 4. Clima, Monitorização, Eventos e Indemnizações

| Método | Rota | Papel | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/climate/observations` | Autenticado | Lista observações diárias filtradas por coordenadas/provedor. |
| `POST` | `/api/climate/fetch` | Autenticado | Consulta API externa real (Open-Meteo ERA5 ou NASA POWER) e valida qualidade. |
| `POST` | `/api/climate/compare` | Autenticado | Cruza Open-Meteo vs NASA POWER; aceita `mode: 'demo_disagreement'` para teste controlado. |
| `POST` | `/api/climate/validate` | Autenticado | Executa `validateClimateSeries` sobre observações numa janela. |
| `POST` | `/api/monitoring/run` | `manager` ou `x-cron-secret` | Executa motor paramétrico sobre apólices activas (ou cenário simulado). |
| `GET` | `/api/events` | Autenticado | Lista eventos climáticos (isolados por agricultor). |
| `GET` | `/api/events/[id]` | Dono / `manager` / `operator` | Detalhe do evento climático com evidências e cálculo associado. |
| `POST` | `/api/events/[id]/review` | `operator`, `manager` | Regista revisão directa sobre um evento climático. |
| `GET` | `/api/indemnities` | Autenticado | Lista cálculos de indemnização. |
| `POST` | `/api/indemnities/calculate` | `manager`, `operator` | Executa ou recalcula indemnização para evento com gatilho activado. |

## 5. Pagamentos, Administração, Operações e Notificações

| Método | Rota | Papel | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/payments` | Autenticado | Histórico de transacções simuladas (isolado por cliente para `farmer`). |
| `POST` | `/api/payments/simulate` | Autenticado | Simula pagamento idempotente (`premium` pelo dono ou `indemnity` por gestor/operador). |
| `GET` | `/api/payments/[id]` | Dono / `manager` | Recibo detalhado de um pagamento simulado. |
| `GET` | `/api/admin/overview` | `manager` | KPIs executivos de carteira, prémios e indemnizações. |
| `GET` | `/api/admin/exposure` | `manager` | Exposição agregada por província angolana. |
| `GET` | `/api/admin/reports` | `manager` | Relatórios operacionais e exportação CSV/JSON. |
| `POST` / `GET` | `/api/admin/basis-risk` | `manager` | Executa análise histórica de risco de base (2021–2025). |
| `GET` / `PATCH` | `/api/admin/settings` | `manager` | Consulta ou actualiza parâmetros globais do sistema. |
| `GET` | `/api/admin/audit` | `manager`, `operator` | Consulta logs imutáveis de auditoria. |
| `GET` | `/api/operations/exceptions` | `operator`, `manager` | Lista excepções climáticas abertas e resolvidas. |
| `POST` | `/api/operations/decisions` | `operator`, `manager` | Regista decisão manual (`approve` / `reject` / `escalate`) com justificação obrigatória. |
| `GET` / `PATCH` | `/api/notifications` | Autenticado | Lista ou marca notificações do utilizador como lidas. |
