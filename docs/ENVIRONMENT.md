# Variáveis de Ambiente (`ENVIRONMENT.md`)

Todas as variáveis esperadas estão declaradas no modelo `.env.example` na raiz do repositório.
Crie o seu ficheiro local com:

```bash
cp .env.example .env.local
```

> **Regra Crítica:** O ficheiro `.env.local` está protegido no `.gitignore` e **nunca** deve ser enviado para o GitHub ou qualquer repositório remoto.

---

## 1. Tabela de Variáveis

| Variável | Obrigatória em Produção | Exposição | Como Obter / Configurar |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sim** | Cliente & Servidor | **Supabase Dashboard** → *Project Settings* → *Data API* → **Project URL**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sim** | Cliente & Servidor | **Supabase Dashboard** → *Project Settings* → *API Keys* → chave **anon / public** (ou *Publishable key*). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sim** | **Estritamente Servidor** | **Supabase Dashboard** → *Project Settings* → *API Keys* → chave **service_role** (ou *Secret key*). **Nunca** usar prefixo `NEXT_PUBLIC_`. |
| `SESSION_SECRET` | **Sim** | **Estritamente Servidor** | Gerada por si localmente (`openssl rand -hex 32` ou Node `randomBytes(32)`). Mínimo recomendado: 64 caracteres hex. |
| `CRON_SECRET` | **Sim** | **Estritamente Servidor** | Gerada por si localmente (`openssl rand -hex 32`). Usada para autenticar `POST /api/monitoring/run` em agendamentos automáticos. |
| `OPEN_METEO_ARCHIVE_URL` | Não (tem padrão) | Servidor | Opcional. Padrão: `https://archive-api.open-meteo.com/v1/archive` (não precisa de chave de API). |
| `NASA_POWER_DAILY_URL` | Não (tem padrão) | Servidor | Opcional. Padrão: `https://power.larc.nasa.gov/api/temporal/daily/point` (não precisa de chave de API). |

---

## 2. Como Gerar `SESSION_SECRET` e `CRON_SECRET`

Estas duas chaves **não vêm do Supabase** — são segredos aleatórios que deve gerar no seu terminal (um diferente para cada variável):

```bash
# Opção A (OpenSSL):
openssl rand -hex 32

# Opção B (Node.js):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Verificação da Ligação (`/api/health`)

Depois de preencher o `.env.local` e reiniciar o servidor (`npm run dev`), valide a ligação ao Supabase abrindo ou consultando:

```bash
curl http://localhost:3000/api/health
```

Em produção ligada ao Supabase com sucesso, receberá:
- `"storageMode": "supabase_postgres"`
- `"databaseReachable": true`
- `"supabaseAdminConfigured": true`
