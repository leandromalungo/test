# Qualidade de Dados Climáticos (`DATA_QUALITY.md`)

A fiabilidade de um seguro paramétrico depende de impedir que falhas de telemetria ou dados omissos sejam confundidos com seca extrema (ex.: tratar um dia sem leitura como `0 mm` dispararia falsas indemnizações).

## 1. Regras Implementadas (`services/climate/validation.ts`)

`validateClimateSeries()` aplica cinco controlos obrigatórios antes de qualquer avaliação de gatilho:

1. **Preservação de `null` vs `0 mm`:** Observações `null` ou `NaN` incrementam `missingDays` e reduzem a percentagem de cobertura; nunca são somadas como `0`.
2. **Coordenadas e Unidade:** Verifica se a propriedade está dentro de `ANGOLA_BOUNDS`, se o ponto retornado não desvia mais de `0.6°` da propriedade e se `unit === 'mm'`.
3. **Valores Fisicamente Plausíveis:** Leituras `< 0 mm` ou `> 500 mm/dia` classificam a série como `invalid_values`.
4. **Detecção de Duplicados:** Datas repetidas na mesma janela e provedor são rejeitadas da soma e marcam `duplicate_detected`.
5. **Cobertura Mínima Contratual:** `completenessPercent = (validDays / expectedDays) × 100`. Se for inferior a `minDataCompletenessPercent` (omissão por defeito: `85%`), `accumulatedPrecipitationMm` é retornado como `null` e `passed = false`.

## 2. Comparação Cruzada Multi-Fonte (`services/climate/comparison.ts`)

Sempre que a fonte primária (Open-Meteo ERA5) e a secundária (NASA POWER) são comparadas:

```text
Desacordo (%) = |Primária - Secundária| / MAX(Primária, Secundária, 1) × 100
```

- Se ambas as fontes registarem chuva residual (`<= 15 mm`) com diferença absoluta `<= 5 mm`, evita-se falso alarme percentual por divisão próximo de zero.
- Se `Desacordo (%) > maxSourceDisagreementPercent` (por omissão `25%`), a comparação falha (`passed = false`), bloqueando o pagamento automático.

## 3. Processo de Revisão Manual (Portal do Operador)

Quando a qualidade falha ou ocorre discordância:
1. O `trigger-engine` cria um `ClimateEvent` no estado `exception` e uma `OperationalException` (`open`).
2. O Operador analisa ambas as séries e comparação em `/operations/exceptions` e `/operations/data-quality`.
3. Para aprovar, rejeitar ou escalar (`POST /api/operations/decisions`), é obrigatório registar justificação (`>= 10` caracteres) e, caso o acumulado inicial seja `null`, fornecer precipitação validada manualmente.
4. Toda a decisão regista estado anterior, estado novo e auditoria imutável.
