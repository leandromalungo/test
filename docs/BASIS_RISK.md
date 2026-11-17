# Risco de Base e Simulação Histórica (`BASIS_RISK.md`)

## 1. O que é Risco de Base

**Risco de base** é a diferença entre o comportamento do **índice meteorológico contratado na apólice** e a **perda agrícola real sofrida na machamba/fazenda**.

- **Falso Negativo:** O produtor sofre quebra severa da colheita (ex.: um veranico de 18 dias durante a floração do milho, pragas, ou chuva mal distribuída), mas o acumulado mensal de chuva atingiu o limiar contratual — logo **não há indemnização automática**.
- **Falso Positivo:** O índice de satélite/reanálise fica abaixo do gatilho devido a resolução da grelha (~9–50 km), mas choveu localmente na parcela e não houve perda real equivalente.

> **Compromisso de Transparência:** A plataforma nunca afirma que um seguro paramétrico cobre todas as perdas agrícolas possíveis. A distinção entre **gatilho climático**, **perda real** e **indemnização apurada** é exibida explicitamente ao gestor, ao agricultor e nos documentos contratuais.

## 2. Metodologia de Análise Histórica (`services/risk/basis-risk-service.ts`)

O módulo `/admin/exposure` disponibiliza o simulador histórico 2021–2025 (`POST /api/admin/basis-risk`):
1. Para uma província, coordenadas, tipo de cobertura, janela (dias) e gatilho (`mm`), consulta séries históricas reais de **Open-Meteo ERA5** e **NASA POWER** (com fallback determinístico documentado apenas se o ambiente estiver offline).
2. Executa `compareClimateSources()` para detectar anos com divergência entre fontes (`data_exception`).
3. Classifica cada campanha anual em:
   - `aligned_trigger` — Gatilho activado alinhado com risco severo.
   - `aligned_no_trigger` — Sem gatilho e sem perda severa.
   - `potential_false_negative` — Acumulado próximo do limiar (`trigger` a `+12%`) onde secas intra-mensais podem causar perdas sem pagamento.
   - `potential_false_positive` — Activação sem correspondência agronómica típica.

## 3. Estratégias de Mitigação

- Escolha de janelas de observação alinhadas com fases fenológicas críticas da cultura (ex.: floração/enchimento de grão).
- Calibração dos gatilhos por zona agroecológica angolana (Semiárido Sul vs Planalto Central).
- Redução futura do risco espacial com incorporação de dados CHIRPS (~5 km) e rede de estações do INAMET.
