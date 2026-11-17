# Estratégia de Testes e Cenários Executáveis (`TESTING.md`)

## 1. Testes Unitários Automatizados (`tests/insurance-engine.test.ts`)

Executados com **Vitest** através do comando `npm test` (`npx vitest run`):

1. **Cálculo de Prémios (`calculateParametricPremium`):**
   - Valida aplicação precisa com `Decimal.js` dos multiplicadores provinciais (ex.: Huambo `1.05` vs Cunene `1.35`).
   - Valida aplicação do prémio mínimo do produto quando o capital segurado é baixo.
2. **Qualidade de Dados Climáticos (`validateClimateSeries`):**
   - Garante que valores `null` nunca são convertidos em `0 mm`.
   - Bloqueia séries abaixo de `minDataCompletenessPercent` retornando `accumulatedPrecipitationMm: null`.
   - Rejeita datas duplicadas e valores negativos/implausíveis (`< 0` ou `> 500 mm`).
3. **Comparação Multi-Fonte (`compareClimateSources`):**
   - Aprova fontes concordantes e reprova divergências acima de `thresholdPercent`.
4. **Motor de Gatilhos e Prevenção de Duplicação (`evaluateParametricTrigger`):**
   - Valida activação de seca abaixo do limiar.
   - Bloqueia segunda avaliação na mesma janela (`duplicatePrevented: true`).
   - Bloqueia activação automática quando há dados insuficientes e cria `OperationalException`.
5. **Indemnizações (`calculateIndemnity`):**
   - Verifica cálculo exacto pelas faixas de severidade (`50%`, `100%`) e respeito absoluto pelo capital segurado máximo.
6. **Idempotência de Pagamentos (`simulatePayment`):**
   - Garante que reenvios com a mesma `idempotencyKey` devolvem `idempotentReplay: true` sem duplicar transacções.

## 2. Verificação de Tipos e Build

```bash
npm run lint    # tsc --noEmit (strict TypeScript)
npm test        # Vitest unit suite
npm run build   # Next.js production build
```

## 3. Cenários Ponta-a-Ponta Executáveis na Interface

Todos os cenários críticos podem ser executados directamente nos portais após login:
- **Registo, Propriedade e Contratação:** `/register` → `/dashboard/farms/new` → `/dashboard/simulate` → pagamento simulado em `/dashboard/policies/[id]` → descarga de PDF.
- **Clima Real:** `/dashboard/climate` ou `/operations/data-quality` → *"Consultar Dados Externos Reais"* (Open-Meteo ERA5) e *"Comparar Open-Meteo vs NASA POWER"*.
- **Motor de Monitorização & Falhas Controladas:** `/admin/monitoring` → executar monitorização com cenários `dry_trigger`, `normal_no_trigger`, `insufficient_data` (dados em falta), `source_disagreement` (discordância) e repetição para confirmar bloqueio de duplicação.
- **Revisão Manual e Auditoria:** `/operations/exceptions` → aprovar/rejeitar/escalar com justificação → confirmar registo em `/operations/approvals` e `/admin/audit`.
