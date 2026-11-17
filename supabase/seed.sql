-- ============================================================================
-- Dados Iniciais do Catálogo para Angola (NOSSA AgroParamétrico)
-- Seguro para re-execução idempotente (`on conflict do nothing`).
-- ============================================================================

insert into public.crops (id, code, name, scientific_name, risk_multiplier, optimal_rainfall_min_mm, optimal_rainfall_max_mm, cycle_days)
values
  ('11111111-1111-4111-8111-111111111101', 'MILHO', 'Milho Branco', 'Zea mays', 1.0000, 500, 950, 120),
  ('11111111-1111-4111-8111-111111111102', 'FEIJAO', 'Feijão Manteiga', 'Phaseolus vulgaris', 1.1200, 400, 800, 95),
  ('11111111-1111-4111-8111-111111111103', 'MANDIOCA', 'Mandioca', 'Manihot esculenta', 0.9000, 600, 1300, 240),
  ('11111111-1111-4111-8111-111111111104', 'SOJA', 'Soja Tropical', 'Glycine max', 1.0800, 480, 900, 115)
on conflict (code) do nothing;

insert into public.agricultural_campaigns (id, code, name, start_date, end_date, status, risk_multiplier)
values
  ('22222222-2222-4222-8222-222222222201', '2026-CHUVAS-1', 'Campanha Agrícola 2026/2027 (Época das Chuvas)', '2026-10-01', '2027-04-30', 'active', 1.0000),
  ('22222222-2222-4222-8222-222222222202', '2026-CACIMBO', 'Campanha Intermédia 2026 (Planalto)', '2026-05-01', '2026-09-30', 'closed', 1.1000)
on conflict (code) do nothing;

insert into public.climate_providers (id, code, name, role, status, endpoint_url, spatial_resolution, temporal_resolution, is_live_external, description)
values
  ('33333333-3333-4333-8333-333333333301', 'open_meteo_era5', 'Open-Meteo ERA5 / ERA5-Land', 'primary', 'active', 'https://archive-api.open-meteo.com/v1/archive', '~9 km (ERA5-Land)', 'Diária (24h)', true, 'Fonte primária aberta baseada em reanálise ERA5-Land do ECMWF.'),
  ('33333333-3333-4333-8333-333333333302', 'nasa_power', 'NASA POWER Daily Agroclimatology', 'confirmation', 'active', 'https://power.larc.nasa.gov/api/temporal/daily/point', '~50 km (0.5° x 0.625°)', 'Diária (24h)', true, 'Fonte secundária de confirmação independente da NASA para comparação de desvios.'),
  ('33333333-3333-4333-8333-333333333303', 'chirps', 'CHIRPS v2.0 (UCSB Climate Hazards)', 'planned', 'planned', 'https://data.chc.ucsb.edu/products/CHIRPS-2.0/', '~5.5 km (0.05°)', 'Diária / Pentadal', false, 'Adaptador documentado para integração futura de séries de satélite CHIRPS.'),
  ('33333333-3333-4333-8333-333333333304', 'inamet', 'INAMET (Instituto Nacional de Meteorologia e Geofísica)', 'planned', 'planned', 'https://inamet.gov.ao (Integração Institucional Pendente)', 'Estações Sinópticas Nacionais', 'Diária', false, 'Adaptador preparado para integração institucional com estações oficiais em Angola.'),
  ('33333333-3333-4333-8333-333333333305', 'ggpen', 'GGPEN (Gabinete de Gestão do Programa Espacial Nacional)', 'planned', 'planned', 'https://ggpen.gov.ao (Integração Institucional Pendente)', 'Observação da Terra Nacional', 'Por Passagem', false, 'Adaptador preparado para índices vegetativos e precipitação via observação espacial nacional.'),
  ('33333333-3333-4333-8333-333333333306', 'copernicus', 'Copernicus Climate Data Store (C3S)', 'planned', 'planned', 'https://cds.climate.copernicus.eu/api', '~9 km', 'Diária / Horária', false, 'Adaptador preparado para acesso via chave CDS API institucional.')
on conflict (code) do nothing;

-- Produtos Paramétricos Iniciais e Respectivas Versões Contratuais
insert into public.insurance_products (id, code, name, description, coverage_type, status, active_version_number)
values
  (
    '44444444-4444-4444-8444-444444444401',
    'AGRO-SECA-30D',
    'Protecção Seca Severa — Milho & Feijão',
    'Cobertura paramétrica contra défice hídrico severo em janelas contínuas de 30 dias durante a fase crítica de floração e enchimento de grão.',
    'drought',
    'active',
    1
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    'AGRO-CHUVA-15D',
    'Protecção Excesso Pluviométrico — Planalto & Norte',
    'Cobertura paramétrica para perdas associadas a enxurradas, alagamento e apodrecimento radicular provocados por precipitação excessiva em 15 dias.',
    'excess_rain',
    'active',
    1
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    'AGRO-SECA-SUL',
    'Protecção Semiárido Sul — Cunene & Huíla',
    'Produto calibrado para zonas semiáridas do sul de Angola com janela estendida de 45 dias e limiar ajustado ao regime pluviométrico local.',
    'drought',
    'active',
    1
  )
on conflict (code) do nothing;

insert into public.insurance_product_versions (
  id,
  product_id,
  version_number,
  supported_crop_ids,
  supported_provinces,
  min_capital_aoa,
  max_capital_aoa,
  base_premium_rate,
  min_premium_aoa,
  trigger_threshold_mm,
  observation_window_days,
  max_source_disagreement_percent,
  min_data_completeness_percent,
  severity_bands
)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '44444444-4444-4444-8444-444444444401',
    1,
    array[
      '11111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111104'::uuid
    ],
    array['Huambo', 'Huíla', 'Benguela', 'Cuanza Sul', 'Bié', 'Cunene', 'Malanje', 'Moxico'],
    150000,
    25000000,
    0.068000,
    12000,
    110,
    30,
    25.00,
    85.00,
    '[
      {"id":"b0","label":"Dentro do intervalo normal","minDeviationPercent":0,"maxDeviationPercent":10,"payoutPercentage":0},
      {"id":"b1","label":"Desvio moderado (Seca moderada)","minDeviationPercent":10,"maxDeviationPercent":25,"payoutPercentage":25},
      {"id":"b2","label":"Desvio significativo","minDeviationPercent":25,"maxDeviationPercent":45,"payoutPercentage":50},
      {"id":"b3","label":"Desvio severo","minDeviationPercent":45,"maxDeviationPercent":65,"payoutPercentage":75},
      {"id":"b4","label":"Desvio extremo (Seca crítica)","minDeviationPercent":65,"maxDeviationPercent":null,"payoutPercentage":100}
    ]'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '44444444-4444-4444-8444-444444444402',
    1,
    array[
      '11111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111102'::uuid,
      '11111111-1111-4111-8111-111111111103'::uuid,
      '11111111-1111-4111-8111-111111111104'::uuid
    ],
    array['Huambo', 'Cuanza Sul', 'Bié', 'Uíge', 'Malanje', 'Luanda', 'Moxico'],
    200000,
    30000000,
    0.059000,
    15000,
    240,
    15,
    25.00,
    85.00,
    '[
      {"id":"e0","label":"Dentro do intervalo normal","minDeviationPercent":0,"maxDeviationPercent":10,"payoutPercentage":0},
      {"id":"e1","label":"Excesso moderado","minDeviationPercent":10,"maxDeviationPercent":25,"payoutPercentage":25},
      {"id":"e2","label":"Excesso significativo","minDeviationPercent":25,"maxDeviationPercent":45,"payoutPercentage":50},
      {"id":"e3","label":"Excesso severo","minDeviationPercent":45,"maxDeviationPercent":70,"payoutPercentage":75},
      {"id":"e4","label":"Excesso extremo (Cheia)","minDeviationPercent":70,"maxDeviationPercent":null,"payoutPercentage":100}
    ]'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '44444444-4444-4444-8444-444444444403',
    1,
    array[
      '11111111-1111-4111-8111-111111111101'::uuid,
      '11111111-1111-4111-8111-111111111102'::uuid
    ],
    array['Cunene', 'Huíla', 'Benguela'],
    100000,
    15000000,
    0.082000,
    10000,
    85,
    45,
    30.00,
    85.00,
    '[
      {"id":"s0","label":"Dentro do intervalo normal","minDeviationPercent":0,"maxDeviationPercent":10,"payoutPercentage":0},
      {"id":"s1","label":"Desvio moderado","minDeviationPercent":10,"maxDeviationPercent":25,"payoutPercentage":25},
      {"id":"s2","label":"Desvio significativo","minDeviationPercent":25,"maxDeviationPercent":45,"payoutPercentage":50},
      {"id":"s3","label":"Desvio severo","minDeviationPercent":45,"maxDeviationPercent":65,"payoutPercentage":75},
      {"id":"s4","label":"Desvio extremo","minDeviationPercent":65,"maxDeviationPercent":null,"payoutPercentage":100}
    ]'::jsonb
  )
on conflict (product_id, version_number) do nothing;

insert into public.insurance_coverages (id, product_version_id, climate_indicator, unit, coverage_description)
values
  ('66666666-6666-4666-8666-666666666601', '55555555-5555-4555-8555-555555555501', 'Precipitação Acumulada em 30 dias', 'mm', 'Défice hídrico severo para culturas anuais.'),
  ('66666666-6666-4666-8666-666666666602', '55555555-5555-4555-8555-555555555502', 'Precipitação Acumulada em 15 dias', 'mm', 'Excesso pluviométrico com risco de enxurrada e alagamento.'),
  ('66666666-6666-4666-8666-666666666603', '55555555-5555-4555-8555-555555555503', 'Precipitação Acumulada em 45 dias', 'mm', 'Seca prolongada em zonas semiáridas do sul.')
on conflict (id) do nothing;

insert into public.system_settings (id, default_disagreement_threshold_percent, default_min_completeness_percent, auto_indemnity_enabled, demonstration_mode_active)
values ('global', 25.00, 85.00, true, false)
on conflict (id) do nothing;

-- ============================================================================
-- NOTA PARA CRIAÇÃO DE GESTORES E OPERADORES NO SUPABASE:
-- 1. Crie os utilizadores em Authentication -> Users no painel do Supabase.
-- 2. Copie o UUID do utilizador criado e execute no SQL Editor:
--    insert into public.profiles (id, email, full_name, province, municipality)
--    values ('<UUID>', 'gestor@suaempresa.ao', 'Nome do Gestor', 'Luanda', 'Ingombota')
--    on conflict (id) do nothing;
--
--    insert into public.user_roles (user_id, role)
--    values ('<UUID>', 'manager') -- ou 'operator'
--    on conflict (user_id, role) do nothing;
-- ============================================================================
