# Guia de Implantação em Produção (`DEPLOYMENT.md`)

Este guia resume os passos exactos para colocar a plataforma **NOSSA AgroParamétrico** em produção ligada ao **Supabase PostgreSQL**.

---

## 1. Requisitos de Produção

- Node.js 20 LTS ou plataforma compatível com Next.js 16 `output: 'standalone'` (Vercel, Cloud Run, Docker/Node).
- Projecto **Supabase** com PostgreSQL 15+, extensões `pgcrypto` e `postgis`, e **Supabase Auth** activos.
- Variáveis configuradas com segurança (`.env.local` localmente ou secret manager do hosting).

---

## 2. Passo-a-Passo de Configuração do Supabase

### Passo 1 — Executar as Migrações SQL e Seed (por ordem exacta)
No **SQL Editor** do seu projecto Supabase (ou via `supabase db push`), execute na ordem seguinte:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_security_concurrency_and_sequences.sql`
4. `supabase/seed.sql`

### Passo 2 — Configurar Autenticação e Contas Administrativas (`manager` e `operator`)
- Os **Agricultores** registam-se directamente pela página `/login` (com validação de NIF e criação automática de conta + perfil + cliente no Supabase).
- Por segurança, as contas de **Gestor** (`manager`) e **Operador** (`operator`) **não possuem auto-registo público**. Crie-as no **Supabase Dashboard → Authentication → Users → Add user** e depois associe o papel no SQL Editor (substituindo `<USER_UUID>` e os dados):

```sql
-- Exemplo para associar conta de Gestor NOSSA Seguros
insert into public.profiles (id, email, full_name, phone)
values ('<USER_UUID>', 'gestor@suaempresa.ao', 'Nome do Gestor', '+244923000001')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'manager')
on conflict (user_id, role) do nothing;

-- Exemplo para associar conta de Operador de Qualidade
insert into public.profiles (id, email, full_name, phone)
values ('<OPERATOR_UUID>', 'operador@suaempresa.ao', 'Nome do Operador', '+244923000002')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.user_roles (user_id, role)
values ('<OPERATOR_UUID>', 'operator')
on conflict (user_id, role) do nothing;
```

### Passo 3 — Configurar URL de Produção no Supabase Auth
Em **Authentication → URL Configuration**, adicione o domínio HTTPS da aplicação em *Site URL* e *Redirect URLs*.

---

## 3. Build, Validação e Arranque

```bash
npm ci
npm run lint
npm test
npm run build
npm start
```

Depois do arranque, confirme o estado do servidor e da base de dados em:
```bash
curl -s https://seu-dominio/api/health
```

---

## 4. Monitorização Climática Agendada (Cron)

Configure um agendador externo (Vercel Cron, GitHub Actions ou Cloud Scheduler) para invocar diariamente o endpoint protegido (com `Authorization: Bearer $CRON_SECRET` ou `x-cron-secret: $CRON_SECRET`):

```bash
curl -X POST https://seu-dominio/api/monitoring/run \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"scenario": "live_active_policies"}'
```
