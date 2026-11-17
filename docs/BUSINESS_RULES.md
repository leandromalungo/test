# Regras de Negócio e Fórmulas Actuariais (Mercado Angolano — AOA)

## 1. Elegibilidade da Propriedade e Cultura

- A propriedade agrícola deve possuir coordenadas geográficas dentro da caixa territorial de Angola (`latitude` entre `-18.2` e `-4.2`; `longitude` entre `11.4` e `24.2`).
- O produto paramétrico seleccionado deve estar no estado `active` e suportar a **província** e a **cultura** da propriedade.
- O capital segurado (`insuredCapitalAoa`) deve estar compreendido entre `minCapitalAoa` e `maxCapitalAoa` definidos na versão activa do produto.

## 2. Cálculo do Prémio Paramétrico (`services/premium/premium-engine.ts`)

Todos os cálculos são executados no servidor usando `Decimal.js` com arredondamento `ROUND_HALF_UP` a duas casas decimais.

### Fórmula

```text
Taxa Efectiva = Taxa Base × Factor Provincial × Factor Cultura × Factor Campanha × Factor Cobertura
Prémio Bruto  = Capital Segurado × Taxa Efectiva
Prémio Final  = MAX(Prémio Bruto, Prémio Mínimo do Produto)
```

Onde:
- `Factor Cobertura`: `1.00` para cobertura de Seca (`drought`), `0.96` para Excesso de Chuva (`excess_rain`).
- `Factor Provincial`: definido em `config/angola.ts` (ex.: Huambo `1.05`, Huíla `1.18`, Cunene `1.35`, Cuanza Sul `1.02`).

### Exemplo Numérico Trabalhado (Huambo — Milho Branco)
- **Capital Segurado:** `2 000 000,00 AOA`
- **Produto:** Protecção Seca Planalto (`basePremiumRate = 0.06`, `minPremiumAoa = 25 000 AOA`)
- **Factores:** Huambo (`1.05`), Milho Branco (`1.00`), Campanha 2026/2027 (`1.00`), Seca (`1.00`)
- **Taxa Efectiva:** `0.06 × 1.05 × 1.00 × 1.00 × 1.00 = 0.063` (6,30%)
- **Prémio Calculado:** `2 000 000 × 0.063 = 126 000,00 AOA`

*(Se o capital fosse `200 000 AOA`, `200 000 × 0.063 = 12 600 AOA < 25 000 AOA`, aplicando-se o prémio mínimo de `25 000,00 AOA`).*

## 3. Regras de Activação de Gatilho (`services/triggers/trigger-engine.ts`)

1. **Pré-requisito obrigatório de qualidade:** se `completenessPercent < minDataCompletenessPercent` (omissão de dias ou `null`), ou se existir discordância entre fontes acima de `maxSourceDisagreementPercent`, o gatilho **não activa pagamento automático** — cria um `ClimateEvent` no estado `exception` e uma `OperationalException`.
2. **Condição de Seca (`drought`):** activa quando `precipitacaoAcumulada < triggerThresholdMm`.
3. **Condição de Excesso de Chuva (`excess_rain`):** activa quando `precipitacaoAcumulada > triggerThresholdMm`.
4. **Prevenção de Duplicação:** cada janela tem chave `policyId:windowStart:windowEnd:coverageType`; uma segunda avaliação idêntica é bloqueada sem gerar evento ou pagamento extra.

## 4. Cálculo da Indemnização (`services/indemnities/indemnity-engine.ts`)

### Fórmula de Desvio Percentual

- **Seca:** `Desvio (%) = ((Gatilho - Observado) / Gatilho) × 100`
- **Excesso de Chuva:** `Desvio (%) = ((Observado - Gatilho) / Gatilho) × 100`

O desvio arredondado é enquadrado nas **faixas de severidade (`severityBands`) copiadas para a apólice**:

| Desvio face ao Gatilho | Classificação | Percentagem Paga |
| --- | --- | --- |
| `< 10%` | Abaixo do limiar mínimo | `0%` |
| `10% a < 25%` | Moderado | `25%` |
| `25% a < 45%` | Significativo | `50%` |
| `45% a < 65%` | Severo | `75%` |
| `>= 65%` | Extremo | `100%` |

### Exemplo Numérico Trabalhado (Indemnização)
- **Apólice:** Capital `2 000 000,00 AOA`, Gatilho de Seca `80,0 mm` em 30 dias.
- **Precipitação Validada Observada:** `48,0 mm`.
- **Desvio:** `((80 - 48) / 80) × 100 = 40,00%`.
- **Faixa Aplicável:** `25% a < 45%` → **50%** do capital segurado.
- **Indemnização Final:** `2 000 000 × 0,50 = 1 000 000,00 AOA` (tecto garantido `<= 2 000 000,00 AOA`).

## 5. Regras de Pagamento e Excepções

- Uma apólice nasce em `pending_payment` e só transita para `active` após confirmação de pagamento simulado com sucesso do prémio.
- Eventos em `exception` exigem intervenção do Operador em `/operations/exceptions` com justificação escrita (`>= 10` caracteres). Apenas decisões `approve` avançam para cálculo de indemnização e estado elegível para pagamento.
