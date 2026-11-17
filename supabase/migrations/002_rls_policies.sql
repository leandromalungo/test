-- ============================================================================
-- Migração 002: Políticas Completas de Row Level Security (RLS)
--
-- Princípios de Segurança Aplicados:
--   1. RLS activado em TODAS as tabelas do esquema público sem excepção.
--   2. Isolamento estrito por utilizador/cliente para agricultores (`farmer`).
--   3. Tabelas críticas (papéis, apólices, termos imutáveis, dados climáticos,
--      eventos, indemnizações, pagamentos, excepções, auditoria e rate limit)
--      são apenas de LEITURA (`SELECT`) para clientes autenticados via PostgREST.
--      Todas as escritas passam exclusivamente pelo servidor Next.js validado
--      (via `service_role` ou funções `SECURITY DEFINER` controladas).
--   4. Uso explícito de `WITH CHECK` para impedir escalada de privilégios
--      ou falsificação de `customer_id` / `user_id` em inserções/actualizações.
-- ============================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where user_id = auth.uid() limit 1;
$$;

-- Activar RLS em TODAS as 27 tabelas do esquema público
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.crops enable row level security;
alter table public.agricultural_campaigns enable row level security;
alter table public.farms enable row level security;
alter table public.farm_locations enable row level security;
alter table public.insurance_products enable row level security;
alter table public.insurance_product_versions enable row level security;
alter table public.insurance_coverages enable row level security;
alter table public.insurance_rules enable row level security;
alter table public.insurance_simulations enable row level security;
alter table public.policies enable row level security;
alter table public.policy_terms enable row level security;
alter table public.climate_providers enable row level security;
alter table public.climate_data_imports enable row level security;
alter table public.climate_observations enable row level security;
alter table public.climate_data_quality_checks enable row level security;
alter table public.climate_source_comparisons enable row level security;
alter table public.climate_events enable row level security;
alter table public.event_evidence enable row level security;
alter table public.indemnity_calculations enable row level security;
alter table public.operational_exceptions enable row level security;
alter table public.event_decisions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- ============================================================================
-- 1. IDENTIDADE, PAPÉIS E CLIENTES
-- ============================================================================

drop policy if exists "Perfis: utilizador vê o próprio perfil ou gestor vê todos" on public.profiles;
create policy "Perfis: utilizador vê o próprio perfil ou gestor vê todos"
  on public.profiles for select
  using (id = auth.uid() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Perfis: utilizador cria o próprio perfil" on public.profiles;
create policy "Perfis: utilizador cria o próprio perfil"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "Perfis: utilizador actualiza o próprio perfil" on public.profiles;
create policy "Perfis: utilizador actualiza o próprio perfil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- user_roles: apenas leitura. Atribuição/alteração de papéis apenas via service_role.
drop policy if exists "Papéis: utilizador lê o próprio papel ou gestor lê todos" on public.user_roles;
create policy "Papéis: utilizador lê o próprio papel ou gestor lê todos"
  on public.user_roles for select
  using (user_id = auth.uid() or public.current_user_role() = 'manager');

drop policy if exists "Clientes: agricultor vê apenas o próprio registo" on public.customers;
create policy "Clientes: agricultor vê apenas o próprio registo"
  on public.customers for select
  using (user_id = auth.uid() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Clientes: agricultor cria/actualiza o próprio registo" on public.customers;
drop policy if exists "Clientes: criação controlada do próprio registo" on public.customers;
create policy "Clientes: criação controlada do próprio registo"
  on public.customers for insert
  with check (user_id = auth.uid() or public.current_user_role() = 'manager');

drop policy if exists "Clientes: actualização controlada do próprio registo" on public.customers;
create policy "Clientes: actualização controlada do próprio registo"
  on public.customers for update
  using (user_id = auth.uid() or public.current_user_role() = 'manager')
  with check (user_id = auth.uid() or public.current_user_role() = 'manager');

-- ============================================================================
-- 2. CATÁLOGOS, CULTURAS, CAMPANHAS E PRODUTOS VERSIONADOS
-- ============================================================================

drop policy if exists "Culturas visíveis para todos os autenticados" on public.crops;
create policy "Culturas visíveis para todos os autenticados"
  on public.crops for select
  using (true);

drop policy if exists "Culturas geridas apenas por gestores" on public.crops;
create policy "Culturas geridas apenas por gestores"
  on public.crops for all
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');

drop policy if exists "Campanhas visíveis para todos" on public.agricultural_campaigns;
create policy "Campanhas visíveis para todos"
  on public.agricultural_campaigns for select
  using (true);

drop policy if exists "Campanhas geridas apenas por gestores" on public.agricultural_campaigns;
create policy "Campanhas geridas apenas por gestores"
  on public.agricultural_campaigns for all
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');

drop policy if exists "Produtos visíveis para leitura pública" on public.insurance_products;
create policy "Produtos visíveis para leitura pública"
  on public.insurance_products for select
  using (true);

drop policy if exists "Produtos configurados apenas por gestores" on public.insurance_products;
create policy "Produtos configurados apenas por gestores"
  on public.insurance_products for all
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');

drop policy if exists "Versões de produtos visíveis para leitura" on public.insurance_product_versions;
create policy "Versões de produtos visíveis para leitura"
  on public.insurance_product_versions for select
  using (true);

drop policy if exists "Versões de produtos criadas apenas por gestores" on public.insurance_product_versions;
create policy "Versões de produtos criadas apenas por gestores"
  on public.insurance_product_versions for insert
  with check (public.current_user_role() = 'manager');

drop policy if exists "Coberturas visíveis para leitura pública" on public.insurance_coverages;
create policy "Coberturas visíveis para leitura pública"
  on public.insurance_coverages for select
  using (true);

drop policy if exists "Coberturas geridas apenas por gestores" on public.insurance_coverages;
create policy "Coberturas geridas apenas por gestores"
  on public.insurance_coverages for all
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');

drop policy if exists "Regras de produto visíveis para leitura autenticada" on public.insurance_rules;
create policy "Regras de produto visíveis para leitura autenticada"
  on public.insurance_rules for select
  using (auth.uid() is not null);

drop policy if exists "Regras de produto geridas apenas por gestores" on public.insurance_rules;
create policy "Regras de produto geridas apenas por gestores"
  on public.insurance_rules for all
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');

-- ============================================================================
-- 3. PROPRIEDADES AGRÍCOLAS E LOCALIZAÇÃO GEOGRÁFICA
-- ============================================================================

drop policy if exists "Propriedades: agricultor acede apenas às suas ou gestor/operador vê todas" on public.farms;
create policy "Propriedades: agricultor acede apenas às suas ou gestor/operador vê todas"
  on public.farms for select
  using (customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Propriedades: agricultor cria/edita apenas as suas" on public.farms;
drop policy if exists "Propriedades: agricultor cria apenas para si" on public.farms;
create policy "Propriedades: agricultor cria apenas para si"
  on public.farms for insert
  with check (customer_id = public.current_customer_id() or public.current_user_role() = 'manager');

drop policy if exists "Propriedades: agricultor edita apenas as suas" on public.farms;
create policy "Propriedades: agricultor edita apenas as suas"
  on public.farms for update
  using (customer_id = public.current_customer_id() or public.current_user_role() = 'manager')
  with check (customer_id = public.current_customer_id() or public.current_user_role() = 'manager');

drop policy if exists "Propriedades: agricultor elimina apenas as suas" on public.farms;
create policy "Propriedades: agricultor elimina apenas as suas"
  on public.farms for delete
  using (customer_id = public.current_customer_id() or public.current_user_role() = 'manager');

drop policy if exists "Localizações: visíveis conforme propriedade" on public.farm_locations;
create policy "Localizações: visíveis conforme propriedade"
  on public.farm_locations for select
  using (
    exists (
      select 1 from public.farms f
      where f.id = farm_locations.farm_id
        and (f.customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'))
    )
  );

drop policy if exists "Localizações: criação conforme propriedade" on public.farm_locations;
create policy "Localizações: criação conforme propriedade"
  on public.farm_locations for insert
  with check (
    exists (
      select 1 from public.farms f
      where f.id = farm_locations.farm_id
        and (f.customer_id = public.current_customer_id() or public.current_user_role() = 'manager')
    )
  );

drop policy if exists "Localizações: actualização conforme propriedade" on public.farm_locations;
create policy "Localizações: actualização conforme propriedade"
  on public.farm_locations for update
  using (
    exists (
      select 1 from public.farms f
      where f.id = farm_locations.farm_id
        and (f.customer_id = public.current_customer_id() or public.current_user_role() = 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.farms f
      where f.id = farm_locations.farm_id
        and (f.customer_id = public.current_customer_id() or public.current_user_role() = 'manager')
    )
  );

-- ============================================================================
-- 4. SIMULAÇÕES, APÓLICES E TERMOS CONTRATUAIS IMUTÁVEIS
-- ============================================================================

drop policy if exists "Simulações: isolamento por agricultor" on public.insurance_simulations;
drop policy if exists "Simulações: leitura isolada por agricultor" on public.insurance_simulations;
create policy "Simulações: leitura isolada por agricultor"
  on public.insurance_simulations for select
  using (customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Simulações: inserção apenas para o próprio cliente" on public.insurance_simulations;
create policy "Simulações: inserção apenas para o próprio cliente"
  on public.insurance_simulations for insert
  with check (customer_id = public.current_customer_id() or public.current_user_role() = 'manager');

-- Apólices e Termos: apenas SELECT via PostgREST.
-- A criação e activação de apólices passam obrigatoriamente pelo servidor (service_role)
-- para impedir que um cliente active apólices sem simulação válida ou pagamento.
drop policy if exists "Apólices: agricultor vê apenas as suas; gestor/operador vê todas" on public.policies;
create policy "Apólices: agricultor vê apenas as suas; gestor/operador vê todas"
  on public.policies for select
  using (customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Apólices: criação controlada" on public.policies;

drop policy if exists "Termos de apólice: leitura alinhada à apólice" on public.policy_terms;
create policy "Termos de apólice: leitura alinhada à apólice"
  on public.policy_terms for select
  using (
    exists (
      select 1 from public.policies p
      where p.id = policy_terms.policy_id
        and (p.customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'))
    )
  );

-- ============================================================================
-- 5. DADOS CLIMÁTICOS, EVENTOS, EXCEPÇÕES E INDEMNIZAÇÕES (ESCRITA VIA SERVIDOR)
-- ============================================================================

drop policy if exists "Provedores climáticos visíveis para utilizadores autenticados" on public.climate_providers;
create policy "Provedores climáticos visíveis para utilizadores autenticados"
  on public.climate_providers for select
  using (auth.uid() is not null);

drop policy if exists "Importações climáticas visíveis para equipa técnica" on public.climate_data_imports;
create policy "Importações climáticas visíveis para equipa técnica"
  on public.climate_data_imports for select
  using (public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Observações climáticas visíveis para utilizadores autenticados" on public.climate_observations;
create policy "Observações climáticas visíveis para utilizadores autenticados"
  on public.climate_observations for select
  using (auth.uid() is not null);

drop policy if exists "Verificações de qualidade visíveis para equipa técnica" on public.climate_data_quality_checks;
create policy "Verificações de qualidade visíveis para equipa técnica"
  on public.climate_data_quality_checks for select
  using (public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Comparações climáticas visíveis para equipa técnica e clientes das apólices" on public.climate_source_comparisons;
create policy "Comparações climáticas visíveis para equipa técnica e clientes das apólices"
  on public.climate_source_comparisons for select
  using (public.current_user_role() in ('manager', 'operator') or exists (
    select 1 from public.policies p where p.id = climate_source_comparisons.policy_id and p.customer_id = public.current_customer_id()
  ));

drop policy if exists "Eventos: agricultor vê os das suas apólices; gestor/operador vê todos" on public.climate_events;
create policy "Eventos: agricultor vê os das suas apólices; gestor/operador vê todos"
  on public.climate_events for select
  using (customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Evidências de eventos visíveis conforme evento" on public.event_evidence;
create policy "Evidências de eventos visíveis conforme evento"
  on public.event_evidence for select
  using (
    public.current_user_role() in ('manager', 'operator') or exists (
      select 1 from public.climate_events e
      where e.id = event_evidence.event_id
        and e.customer_id = public.current_customer_id()
    )
  );

drop policy if exists "Indemnizações: isolamento por apólice" on public.indemnity_calculations;
create policy "Indemnizações: isolamento por apólice"
  on public.indemnity_calculations for select
  using (
    public.current_user_role() in ('manager', 'operator') or exists (
      select 1 from public.policies p where p.id = indemnity_calculations.policy_id and p.customer_id = public.current_customer_id()
    )
  );

-- Excepções e decisões: leitura apenas por operadores e gestores; escrita exclusiva via servidor/RPC atómica
drop policy if exists "Excepções operacionais: exclusivas para operadores e gestores" on public.operational_exceptions;
drop policy if exists "Excepções operacionais: leitura por operadores e gestores" on public.operational_exceptions;
create policy "Excepções operacionais: leitura por operadores e gestores"
  on public.operational_exceptions for select
  using (public.current_user_role() in ('operator', 'manager'));

drop policy if exists "Decisões manuais: leitura por operadores/gestores e escrita por operadores" on public.event_decisions;
drop policy if exists "Decisões manuais: leitura por operadores e gestores" on public.event_decisions;
create policy "Decisões manuais: leitura por operadores e gestores"
  on public.event_decisions for select
  using (public.current_user_role() in ('operator', 'manager'));

drop policy if exists "Decisões manuais: registo apenas por operadores" on public.event_decisions;

-- ============================================================================
-- 6. PAGAMENTOS, NOTIFICAÇÕES, AUDITORIA E CONFIGURAÇÕES
-- ============================================================================

drop policy if exists "Pagamentos: agricultor vê apenas os seus" on public.payments;
create policy "Pagamentos: agricultor vê apenas os seus"
  on public.payments for select
  using (customer_id = public.current_customer_id() or public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Transacções de gateway visíveis apenas para equipa técnica" on public.payment_transactions;
create policy "Transacções de gateway visíveis apenas para equipa técnica"
  on public.payment_transactions for select
  using (public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Notificações: leitura pelo destinatário ou perfil" on public.notifications;
create policy "Notificações: leitura pelo destinatário ou perfil"
  on public.notifications for select
  using (user_id = auth.uid() or (user_id is null and target_role = public.current_user_role()) or public.current_user_role() = 'manager');

drop policy if exists "Notificações: marcar como lida pelo destinatário" on public.notifications;
create policy "Notificações: marcar como lida pelo destinatário"
  on public.notifications for update
  using (user_id = auth.uid() or (user_id is null and target_role = public.current_user_role()) or public.current_user_role() = 'manager')
  with check (user_id = auth.uid() or (user_id is null and target_role = public.current_user_role()) or public.current_user_role() = 'manager');

-- Auditoria imutável: apenas leitura por gestores e operadores; inserção exclusiva via service_role
drop policy if exists "Auditoria: leitura apenas por gestores e operadores" on public.audit_logs;
create policy "Auditoria: leitura apenas por gestores e operadores"
  on public.audit_logs for select
  using (public.current_user_role() in ('manager', 'operator'));

drop policy if exists "Configurações do sistema: leitura geral e escrita por gestor" on public.system_settings;
create policy "Configurações do sistema: leitura geral e escrita por gestor"
  on public.system_settings for select
  using (auth.uid() is not null);

drop policy if exists "Configurações do sistema: alteração exclusiva por gestor" on public.system_settings;
create policy "Configurações do sistema: alteração exclusiva por gestor"
  on public.system_settings for update
  using (public.current_user_role() = 'manager')
  with check (public.current_user_role() = 'manager');
