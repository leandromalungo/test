-- ============================================================================
-- Migração 001: Esquema Normalizado da Plataforma de Seguro Agrícola Paramétrico
-- Mercado Angolano (NOSSA AgroParamétrico)
-- Inclui: Identidade, Agricultura, Produtos Versionados, Apólices, Clima,
-- Eventos, Indemnizações, Pagamentos, Notificações, Excepções e Auditoria.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- ----------------------------------------------------------------------------
-- 1. IDENTIDADE E UTILIZADORES
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text not null default '',
  nif text not null default '',
  province text not null default 'Huambo',
  municipality text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('farmer', 'manager', 'operator')),
  assigned_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  nif text not null unique,
  province text not null,
  municipality text not null,
  farmer_category text not null check (farmer_category in ('smallholder', 'medium_producer', 'cooperative')) default 'smallholder',
  kyc_status text not null check (kyc_status in ('verified', 'pending')) default 'verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. AGRICULTURA E PROPRIEDADES
-- ----------------------------------------------------------------------------

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scientific_name text not null,
  risk_multiplier numeric(6, 4) not null default 1.0000 check (risk_multiplier > 0),
  optimal_rainfall_min_mm numeric(8, 2) not null,
  optimal_rainfall_max_mm numeric(8, 2) not null,
  cycle_days integer not null check (cycle_days > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.agricultural_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('upcoming', 'active', 'closed')) default 'active',
  risk_multiplier numeric(6, 4) not null default 1.0000 check (risk_multiplier > 0),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  area_hectares numeric(10, 2) not null check (area_hectares > 0),
  primary_crop_id uuid not null references public.crops(id),
  soil_type text not null default 'Franco-argiloso',
  irrigation_type text not null check (irrigation_type in ('rainfed', 'partial_irrigation')) default 'rainfed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farm_locations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null unique references public.farms(id) on delete cascade,
  province text not null,
  municipality text not null,
  commune text not null,
  latitude numeric(9, 6) not null check (latitude between -18.2 and -4.2),
  longitude numeric(9, 6) not null check (longitude between 11.4 and 24.2),
  geom geography(Point, 4326),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. PRODUTOS DE SEGURO VERSIONADOS, SIMULAÇÕES E APÓLICES
-- ----------------------------------------------------------------------------

create table if not exists public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  coverage_type text not null check (coverage_type in ('drought', 'excess_rain')),
  status text not null check (status in ('active', 'inactive')) default 'active',
  active_version_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insurance_product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.insurance_products(id) on delete cascade,
  version_number integer not null,
  supported_crop_ids uuid[] not null,
  supported_provinces text[] not null,
  min_capital_aoa numeric(14, 2) not null check (min_capital_aoa > 0),
  max_capital_aoa numeric(14, 2) not null check (max_capital_aoa >= min_capital_aoa),
  base_premium_rate numeric(8, 6) not null check (base_premium_rate > 0),
  min_premium_aoa numeric(14, 2) not null check (min_premium_aoa > 0),
  trigger_threshold_mm numeric(8, 2) not null check (trigger_threshold_mm > 0),
  observation_window_days integer not null check (observation_window_days > 0),
  max_source_disagreement_percent numeric(5, 2) not null default 25.00,
  min_data_completeness_percent numeric(5, 2) not null default 85.00,
  severity_bands jsonb not null,
  created_at timestamptz not null default now(),
  unique (product_id, version_number)
);

create table if not exists public.insurance_coverages (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.insurance_product_versions(id) on delete cascade,
  climate_indicator text not null,
  unit text not null default 'mm',
  coverage_description text not null
);

create table if not exists public.insurance_rules (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.insurance_product_versions(id) on delete cascade,
  rule_name text not null,
  rule_expression jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.insurance_simulations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  farm_id uuid not null references public.farms(id),
  crop_id uuid not null references public.crops(id),
  campaign_id uuid not null references public.agricultural_campaigns(id),
  product_id uuid not null references public.insurance_products(id),
  product_version_id uuid not null references public.insurance_product_versions(id),
  insured_capital_aoa numeric(14, 2) not null check (insured_capital_aoa > 0),
  estimated_premium_aoa numeric(14, 2) not null check (estimated_premium_aoa > 0),
  max_possible_indemnity_aoa numeric(14, 2) not null,
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  policy_number text not null unique,
  simulation_id uuid not null references public.insurance_simulations(id),
  customer_id uuid not null references public.customers(id),
  farm_id uuid not null references public.farms(id),
  crop_id uuid not null references public.crops(id),
  campaign_id uuid not null references public.agricultural_campaigns(id),
  product_id uuid not null references public.insurance_products(id),
  product_version_id uuid not null references public.insurance_product_versions(id),
  insured_capital_aoa numeric(14, 2) not null check (insured_capital_aoa > 0),
  premium_aoa numeric(14, 2) not null check (premium_aoa > 0),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('draft', 'pending_payment', 'active', 'expired', 'cancelled')) default 'pending_payment',
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Instantâneo imutável das regras contratuais no momento da subscrição
create table if not exists public.policy_terms (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null unique references public.policies(id) on delete cascade,
  product_version_id uuid not null references public.insurance_product_versions(id),
  coverage_type text not null check (coverage_type in ('drought', 'excess_rain')),
  climate_indicator text not null,
  trigger_threshold_mm numeric(8, 2) not null,
  observation_window_days integer not null,
  min_data_completeness_percent numeric(5, 2) not null,
  max_source_disagreement_percent numeric(5, 2) not null,
  severity_bands jsonb not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  is_simulated_demonstration boolean not null default true
);

-- ----------------------------------------------------------------------------
-- 4. DADOS CLIMÁTICOS E VALIDAÇÃO DE QUALIDADE
-- ----------------------------------------------------------------------------

create table if not exists public.climate_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  role text not null check (role in ('primary', 'confirmation', 'planned')),
  status text not null check (status in ('active', 'planned', 'degraded')),
  endpoint_url text not null,
  spatial_resolution text not null,
  temporal_resolution text not null,
  is_live_external boolean not null default true,
  description text not null
);

create table if not exists public.climate_data_imports (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null references public.climate_providers(code),
  farm_id uuid references public.farms(id),
  request_url text not null,
  window_start date not null,
  window_end date not null,
  records_imported integer not null default 0,
  is_simulated_data boolean not null default false,
  imported_at timestamptz not null default now()
);

create table if not exists public.climate_observations (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references public.climate_data_imports(id) on delete set null,
  provider_code text not null references public.climate_providers(code),
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  observation_date date not null,
  precipitation_mm numeric(8, 2),
  unit text not null default 'mm' check (unit = 'mm'),
  retrieved_at timestamptz not null default now(),
  source_url text not null,
  spatial_resolution text not null,
  quality_status text not null check (quality_status in ('valid', 'insufficient', 'invalid_values', 'delayed', 'source_disagreement', 'duplicate_detected')),
  is_simulated_data boolean not null default false,
  raw_payload_reference text not null,
  validation_notes jsonb not null default '[]'::jsonb,
  unique (provider_code, latitude, longitude, observation_date)
);

create table if not exists public.climate_data_quality_checks (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references public.climate_data_imports(id) on delete cascade,
  completeness_percent numeric(5, 2) not null,
  missing_days integer not null,
  invalid_records integer not null,
  duplicate_records integer not null,
  passed boolean not null,
  details jsonb not null,
  checked_at timestamptz not null default now()
);

create table if not exists public.climate_source_comparisons (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id),
  policy_id uuid references public.policies(id),
  window_start date not null,
  window_end date not null,
  primary_provider text not null,
  secondary_provider text not null,
  primary_accumulated_mm numeric(8, 2),
  secondary_accumulated_mm numeric(8, 2),
  disagreement_percent numeric(6, 2),
  disagreement_absolute_mm numeric(8, 2),
  threshold_percent numeric(5, 2) not null,
  passed boolean not null,
  notes text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. EVENTOS CLIMÁTICOS, EXCEPÇÕES E INDEMNIZAÇÕES
-- ----------------------------------------------------------------------------

create table if not exists public.climate_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  policy_id uuid not null references public.policies(id),
  customer_id uuid not null references public.customers(id),
  farm_id uuid not null references public.farms(id),
  coverage_type text not null check (coverage_type in ('drought', 'excess_rain')),
  window_start date not null,
  window_end date not null,
  observed_precipitation_mm numeric(8, 2),
  contractual_threshold_mm numeric(8, 2) not null,
  data_quality_status text not null,
  comparison_id uuid references public.climate_source_comparisons(id),
  status text not null check (status in (
    'monitoring',
    'potential_event',
    'data_validation_pending',
    'trigger_activated',
    'trigger_not_activated',
    'manual_review',
    'indemnity_calculated',
    'payment_pending',
    'paid',
    'rejected',
    'exception'
  )),
  rule_applied_explanation text not null,
  evidence_summary text not null,
  is_simulated_scenario boolean not null default false,
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.climate_events(id) on delete cascade,
  provider_code text not null,
  evidence_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.indemnity_calculations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.climate_events(id) on delete cascade,
  policy_id uuid not null references public.policies(id),
  insured_capital_aoa numeric(14, 2) not null,
  observed_precipitation_mm numeric(8, 2) not null,
  contractual_threshold_mm numeric(8, 2) not null,
  deviation_percent numeric(8, 2) not null,
  severity_label text not null,
  payout_percentage numeric(5, 2) not null check (payout_percentage between 0 and 100),
  calculated_indemnity_aoa numeric(14, 2) not null check (calculated_indemnity_aoa <= insured_capital_aoa),
  capped_at_maximum boolean not null default false,
  explanation text not null,
  evidence_summary text not null,
  calculated_at timestamptz not null default now()
);

create table if not exists public.operational_exceptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.climate_events(id) on delete cascade,
  policy_id uuid not null references public.policies(id),
  reason_code text not null check (reason_code in ('insufficient_data', 'source_disagreement', 'duplicate_attempt', 'delayed_data', 'invalid_values')),
  severity text not null check (severity in ('medium', 'high', 'critical')),
  description text not null,
  status text not null check (status in ('open', 'under_review', 'approved', 'rejected', 'escalated')) default 'open',
  assigned_operator_id uuid references public.profiles(id),
  decision_reason text,
  previous_event_status text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.event_decisions (
  id uuid primary key default gen_random_uuid(),
  exception_id uuid not null references public.operational_exceptions(id) on delete cascade,
  event_id uuid not null references public.climate_events(id) on delete cascade,
  operator_user_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('approve', 'reject', 'escalate')),
  previous_status text not null,
  new_status text not null,
  reason text not null,
  decided_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. PAGAMENTOS SIMULADOS
-- ----------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  transaction_reference text not null unique,
  kind text not null check (kind in ('premium', 'indemnity')),
  customer_id uuid not null references public.customers(id),
  policy_id uuid not null references public.policies(id),
  event_id uuid references public.climate_events(id),
  amount_aoa numeric(14, 2) not null check (amount_aoa > 0),
  channel text not null,
  status text not null check (status in ('pending', 'processing', 'successful', 'failed', 'cancelled')),
  failure_reason text,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  gateway_name text not null,
  status text not null,
  payload jsonb not null,
  recorded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICAÇÕES, CONFIGURAÇÕES E AUDITORIA IMUTÁVEL
-- ----------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  target_role text check (target_role in ('farmer', 'manager', 'operator')),
  title text not null,
  message text not null,
  category text not null check (category in ('policy', 'climate', 'payment', 'exception', 'system')),
  is_read boolean not null default false,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  user_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  result text not null check (result in ('success', 'failure', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id text primary key default 'global',
  default_disagreement_threshold_percent numeric(5, 2) not null default 25.00,
  default_min_completeness_percent numeric(5, 2) not null default 85.00,
  auto_indemnity_enabled boolean not null default true,
  demonstration_mode_active boolean not null default true,
  primary_climate_provider text not null default 'open_meteo_era5',
  confirmation_climate_provider text not null default 'nasa_power',
  updated_at timestamptz not null default now()
);

-- Índices para performance em consultas frequentes
create index if not exists idx_farms_customer_id on public.farms(customer_id);
create index if not exists idx_policies_customer_id on public.policies(customer_id);
create index if not exists idx_policies_status on public.policies(status);
create index if not exists idx_climate_obs_coords_date on public.climate_observations(provider_code, latitude, longitude, observation_date);
create index if not exists idx_climate_events_policy_id on public.climate_events(policy_id);
create index if not exists idx_climate_events_status on public.climate_events(status);
create index if not exists idx_exceptions_status on public.operational_exceptions(status);
create index if not exists idx_payments_policy_id on public.payments(policy_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
