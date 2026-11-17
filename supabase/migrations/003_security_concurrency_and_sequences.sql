-- ============================================================================
-- Migração 003: Segurança Distribuída, Concorrência e Sequência Atómica
--
-- Objectivos:
--   1. Numeração atómica de apólices (`policy_number_seq` + `next_policy_number`)
--      imune a condições de corrida entre pedidos simultâneos.
--   2. Índice único parcial que impede duas apólices activas/pendentes para
--      a mesma simulação.
--   3. Tabela e função atómica de Rate Limiting / Anti-Força-Bruta distribuídos
--      (`security_rate_limits` + `check_and_increment_rate_limit`).
--   4. Triggers de imutabilidade em `audit_logs`, `policy_terms` e bloqueio de
--      reabertura de `operational_exceptions` já encerradas (`approved`/`rejected`).
--   5. Função transaccional atómica `resolve_operational_exception` com
--      bloqueio `SELECT ... FOR UPDATE` para decisões operacionais.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEQUÊNCIA ATÓMICA DE NUMERAÇÃO DE APÓLICES
-- ----------------------------------------------------------------------------

create sequence if not exists public.policy_number_seq
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

-- Garante que a sequência arranca acima do número actual de apólices existentes
select setval(
  'public.policy_number_seq',
  greatest((select count(*)::bigint from public.policies), 0) + 1,
  false
);

create or replace function public.next_policy_number(
  p_year integer default extract(year from timezone('UTC', now()))::integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
begin
  v_seq := nextval('public.policy_number_seq');
  return 'NS-AGRO-' || p_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.next_policy_number(integer) from public, anon, authenticated;
grant execute on function public.next_policy_number(integer) to service_role;

-- Impede subscrição duplicada concorrente a partir da mesma simulação
create unique index if not exists idx_policies_unique_non_cancelled_sim
  on public.policies(simulation_id)
  where status <> 'cancelled';

-- ----------------------------------------------------------------------------
-- 2. RATE LIMITING E ANTI-FORÇA-BRUTA DISTRIBUÍDOS
-- ----------------------------------------------------------------------------

create table if not exists public.security_rate_limits (
  bucket_key text primary key,
  hit_count integer not null default 1 check (hit_count >= 0),
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.security_rate_limits enable row level security;

-- Zero políticas públicas: acessível exclusivamente via service_role / RPC controlada
create index if not exists idx_security_rate_limits_window_start
  on public.security_rate_limits(window_start);

create or replace function public.check_and_increment_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_ms bigint
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_interval interval := (p_window_ms::numeric / 1000.0) * interval '1 second';
  v_row public.security_rate_limits%rowtype;
  v_expires_at timestamptz;
begin
  insert into public.security_rate_limits as rl (bucket_key, hit_count, window_start, updated_at)
  values (p_bucket_key, 1, v_now, v_now)
  on conflict (bucket_key) do update
    set hit_count = case
      when rl.window_start + v_window_interval <= v_now then 1
      else rl.hit_count + 1
    end,
    window_start = case
      when rl.window_start + v_window_interval <= v_now then v_now
      else rl.window_start
    end,
    updated_at = v_now
  returning * into v_row;

  if v_row.hit_count > p_max_requests then
    v_expires_at := v_row.window_start + v_window_interval;
    return query select
      false,
      0,
      greatest(1, ceil(extract(epoch from (v_expires_at - v_now)))::integer);
  else
    return query select
      true,
      greatest(0, p_max_requests - v_row.hit_count),
      0;
  end if;
end;
$$;

revoke all on function public.check_and_increment_rate_limit(text, integer, bigint) from public, anon, authenticated;
grant execute on function public.check_and_increment_rate_limit(text, integer, bigint) to service_role;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS DE IMUTABILIDADE E BLOQUEIO DE REABERTURA DE EXCEPÇÕES
-- ----------------------------------------------------------------------------

create or replace function public.prevent_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registo imutável na tabela %. Alterações ou eliminações não são permitidas.', tg_table_name;
end;
$$;

drop trigger if exists trg_audit_logs_immutable on public.audit_logs;
create trigger trg_audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_immutable_mutation();

drop trigger if exists trg_policy_terms_immutable on public.policy_terms;
create trigger trg_policy_terms_immutable
  before update or delete on public.policy_terms
  for each row execute function public.prevent_immutable_mutation();

create or replace function public.prevent_closed_exception_reopen()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('approved', 'rejected') then
    raise exception 'Excepção operacional % já encerrada com estado %. Não é permitido reabrir ou alterar decisão final.', old.id, old.status
      using errcode = 'P0002';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_operational_exceptions_final_state on public.operational_exceptions;
create trigger trg_operational_exceptions_final_state
  before update on public.operational_exceptions
  for each row execute function public.prevent_closed_exception_reopen();

-- ----------------------------------------------------------------------------
-- 4. RESOLUÇÃO ATÓMICA DE EXCEPÇÕES OPERACIONAIS (COM FOR UPDATE)
-- ----------------------------------------------------------------------------

create or replace function public.resolve_operational_exception(
  p_exception_id uuid,
  p_operator_user_id uuid,
  p_decision text,
  p_reason text,
  p_new_exception_status text,
  p_new_event_status text,
  p_new_event_explanation text,
  p_observed_precipitation_mm numeric default null,
  p_indemnity_observed_mm numeric default null,
  p_indemnity_threshold_mm numeric default null,
  p_indemnity_deviation_percent numeric default null,
  p_indemnity_severity_label text default null,
  p_indemnity_payout_percentage numeric default null,
  p_indemnity_amount_aoa numeric default null,
  p_indemnity_capped boolean default false,
  p_indemnity_explanation text default null,
  p_indemnity_evidence text default null,
  p_insured_capital_aoa numeric default null
)
returns table (
  exception_id uuid,
  event_id uuid,
  previous_exception_status text,
  previous_event_status text,
  indemnity_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exc public.operational_exceptions%rowtype;
  v_evt public.climate_events%rowtype;
  v_now timestamptz := timezone('UTC', now());
  v_ind_id uuid := null;
begin
  select * into v_exc
  from public.operational_exceptions
  where id = p_exception_id
  for update;

  if not found then
    raise exception 'Excepção operacional não encontrada.' using errcode = 'P0001';
  end if;

  if v_exc.status in ('approved', 'rejected') then
    raise exception 'Excepção já encerrada (%). Não é possível alterar ou reabrir uma decisão final.', v_exc.status
      using errcode = 'P0002';
  end if;

  select * into v_evt
  from public.climate_events
  where id = v_exc.event_id
  for update;

  if not found then
    raise exception 'Evento climático associado não encontrado.' using errcode = 'P0001';
  end if;

  update public.operational_exceptions
  set
    status = p_new_exception_status,
    assigned_operator_id = p_operator_user_id,
    decision_reason = p_reason,
    resolved_at = case when p_decision = 'escalate' then null else v_now end
  where id = v_exc.id;

  insert into public.event_decisions (
    exception_id,
    event_id,
    operator_user_id,
    decision,
    previous_status,
    new_status,
    reason,
    decided_at
  ) values (
    v_exc.id,
    v_evt.id,
    p_operator_user_id,
    p_decision,
    v_exc.status,
    p_new_exception_status,
    p_reason,
    v_now
  );

  update public.climate_events
  set
    status = p_new_event_status,
    observed_precipitation_mm = coalesce(p_observed_precipitation_mm, observed_precipitation_mm),
    rule_applied_explanation = p_new_event_explanation,
    updated_at = v_now
  where id = v_evt.id;

  if p_decision = 'approve' and p_indemnity_amount_aoa is not null then
    insert into public.indemnity_calculations (
      event_id,
      policy_id,
      insured_capital_aoa,
      observed_precipitation_mm,
      contractual_threshold_mm,
      deviation_percent,
      severity_label,
      payout_percentage,
      calculated_indemnity_aoa,
      capped_at_maximum,
      explanation,
      evidence_summary,
      calculated_at
    ) values (
      v_evt.id,
      v_exc.policy_id,
      p_insured_capital_aoa,
      p_indemnity_observed_mm,
      p_indemnity_threshold_mm,
      p_indemnity_deviation_percent,
      p_indemnity_severity_label,
      p_indemnity_payout_percentage,
      p_indemnity_amount_aoa,
      p_indemnity_capped,
      p_indemnity_explanation,
      p_indemnity_evidence,
      v_now
    )
    on conflict on constraint indemnity_calculations_event_id_key do nothing
    returning id into v_ind_id;

    if v_ind_id is null then
      select id into v_ind_id from public.indemnity_calculations where event_id = v_evt.id limit 1;
    end if;
  end if;

  return query select v_exc.id, v_evt.id, v_exc.status, v_evt.status, v_ind_id;
end;
$$;

revoke all on function public.resolve_operational_exception(
  uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, text, numeric, numeric, boolean, text, text, numeric
) from public, anon, authenticated;

grant execute on function public.resolve_operational_exception(
  uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, text, numeric, numeric, boolean, text, text, numeric
) to service_role;
