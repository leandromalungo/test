# Integração de Dados Climáticos (`CLIMATE_DATA.md`)

A arquitectura separa de forma transparente as **fontes externas reais actualmente integradas** dos **adaptadores institucionais planeados para fases futuras**.

## 1. Provedores Activos em Tempo Real

### 1.1 Open-Meteo Archive API (ERA5 / ERA5-Land) — Fonte Primária
- **Identificador:** `open_meteo_era5`
- **Adaptador:** `services/climate/providers/open-meteo.ts`
- **Endpoint:** `https://archive-api.open-meteo.com/v1/archive` (configurável via `OPEN_METEO_ARCHIVE_URL`)
- **Variável consultada:** `daily=precipitation_sum` com `timezone=UTC`
- **Unidade:** milímetros (`mm`)
- **Resolução Espacial / Temporal:** ~9 km (ERA5-Land) a ~25 km (ERA5) | Diária
- **Autenticação:** Sem chave de API obrigatória para uso não comercial / avaliação; uso comercial requer licença/plano dedicado da Open-Meteo.
- **Atribuição:** Dados Copernicus Climate Change Service (C3S) / ECMWF processados via Open-Meteo.

### 1.2 NASA POWER Daily API (`PRECTOTCORR`) — Fonte Secundária de Confirmação
- **Identificador:** `nasa_power`
- **Adaptador:** `services/climate/providers/nasa-power.ts`
- **Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point` (configurável via `NASA_POWER_DAILY_URL`)
- **Variável consultada:** `parameters=PRECTOTCORR` (`community=AG`)
- **Normalização:** O valor sentinela `-999` da NASA POWER é convertido imediatamente para `null` (dado em falta), **nunca para `0 mm`**.
- **Resolução Espacial / Temporal:** ~0.5° × 0.625° (~50 km) | Diária
- **Atribuição:** NASA Langley Research Center POWER Project (dados públicos abertos).

## 2. Adaptadores Planeados (Não Activos no MVP)

Definidos em `services/climate/providers/index.ts` para visibilidade técnica e futura integração sob acordo institucional (nunca simulados como activos):
- **`chirps`** (UCSB CHIRPS Satellite Precipitation, ~5 km) — Requer pipeline raster/GeoTIFF ou servidor THREDDS/Google Earth Engine.
- **`inamet`** (Instituto Nacional de Meteorologia e Geofísica de Angola) — Estações sinópticas locais; pendente de protocolo institucional e API oficial.
- **`ggpen`** (Gabinete de Gestão do Programa Espacial Nacional) — Observação da Terra angolana; pendente de integração institucional.
- **`copernicus`** (Copernicus CDS API) — Acesso directo a conjuntos de dados C3S mediante credenciais CDS.

## 3. Fluxo de Recolha e Normalização

1. O utilizador ou cron chama `POST /api/climate/fetch` ou `POST /api/monitoring/run`.
2. O adaptador consulta a API externa pelas coordenadas exactas da propriedade (`latitude`, `longitude`) e intervalo `[startDate, endDate]`.
3. Cada observação é normalizada para `ClimateObservation` com `unit: 'mm'`, `sourceUrl`, `retrievedAt`, `rawPayloadReference` e `isSimulatedData: false`.
4. Dados pré-carregados de demonstração ou de cenários de falha são marcados estritamente com `isSimulatedData: true`.

## 4. Limitações Conhecidas

- Reanálises globais (~9–50 km) podem diferir de chuvas convectivas localizadas em micro-bacias agrícolas angolanas.
- Janelas muito recentes (< 5 dias) podem sofrer atraso de consolidação na API ERA5 (`delayed`), devendo aguardar consolidação ou passar por validação manual.
