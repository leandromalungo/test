# Pagamentos Simulados e Idempotência (`PAYMENTS.md`)

## 1. Política de Transparência no MVP

Todos os movimentos financeiros no MVP operam **exclusivamente em Modo Simulado** (`isSimulated: true`). Nenhuma integração real com redes bancárias ou carteiras móveis é executada nem simulada enganosamente como liquidação real.

Canais simulados disponíveis para demonstração angolana:
- `multicaixa_express_sim` — Multicaixa Express (Simulação)
- `bai_directo_sim` — BAI Directo (Simulação)
- `unitel_money_sim` — Unitel Money (Simulação)

## 2. Estados e Fluxos (`services/payments/payment-service.ts`)

Estados suportados: `pending`, `processing`, `successful`, `failed`, `cancelled`.

1. **Pagamento Simulado de Prémio (`kind: 'premium'`):**
   - Executado pelo próprio agricultor dono da apólice (ou gestor).
   - Se `simulateOutcome === 'successful'`, actualiza a apólice de `pending_payment` para `active`, grava `issuedAt`, notifica o agricultor e liberta o PDF da apólice.
   - Se `simulateOutcome === 'failed'`, mantém a apólice pendente e regista o motivo da falha para demonstração de recuperação de erro.
2. **Pagamento Simulado de Indemnização (`kind: 'indemnity'`):**
   - Executado apenas por `manager` ou `operator` sobre um evento no estado `indemnity_calculated` ou `payment_pending`.
   - Em caso de sucesso, transita o evento para `paid`, gera referência única `NS-SIM-IND-AAAAMMDD-XXXXXX` e notifica o segurado.

## 3. Protecção por Idempotência

Cada pedido de simulação recebe uma `idempotencyKey`. Se o cliente reenviar o mesmo pedido (por duplo clique ou falha de rede), `simulatePayment()` devolve imediatamente o registo anterior (`idempotentReplay: true`) sem criar segunda transacção nem duplicar notificações ou créditos.

## 4. Extensibilidade Futura para Gateways Angolanos

A separação em `services/payments/payment-service.ts` permite introduzir um padrão *Provider Adapter* para futuros conectores **EMIS / Multicaixa Express API** ou **Unitel Money Merchant API** mantendo o mesmo modelo de `payments`, `payment_transactions` e `idempotency_key`.
