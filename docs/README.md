# Índice de Documentação Técnica — NOSSA AgroParamétrico

Bem-vindo à documentação técnica oficial do MVP **NOSSA AgroParamétrico**, concebido para o mercado segurador agrícola de Angola.

## Mapa Documental

| Documento | Âmbito |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Topologia Next.js App Router, separação de camadas, fluxo de dados e decisões técnicas |
| [DATABASE.md](./DATABASE.md) | Modelo relacional PostgreSQL/PostGIS, restrições, índices e políticas RLS |
| [API.md](./API.md) | Catálogo completo de endpoints REST (`/api/**`), payloads, papéis e respostas |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Fluxo híbrido Supabase Auth + sessões HMAC-SHA256 para Modo Demonstração |
| [SECURITY.md](./SECURITY.md) | RBAC server-side, RLS, rate limiting, gestão de segredos e protecção contra duplicação |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Elegibilidade, cálculo de prémios, gatilhos, faixas de severidade e exemplos em AOA |
| [INSURANCE_ENGINE.md](./INSURANCE_ENGINE.md) | Versionamento de produtos, imutabilidade contratual (`contractTerms`) e geração de PDF |
| [CLIMATE_DATA.md](./CLIMATE_DATA.md) | Provedores activos (Open-Meteo ERA5, NASA POWER) vs adaptadores futuros (INAMET, GGPEN, CHIRPS, Copernicus) |
| [DATA_QUALITY.md](./DATA_QUALITY.md) | Tratamento de `null` vs `0 mm`, completude mínima, duplicados e comparação multi-fonte |
| [BASIS_RISK.md](./BASIS_RISK.md) | Conceito de risco de base, falsos positivos/negativos e metodologia histórica |
| [PAYMENTS.md](./PAYMENTS.md) | Simulação idempotente de prémios/indemnizações e extensibilidade para gateways angolanos |
| [AUDIT.md](./AUDIT.md) | Registo imutável (`audit_logs`) e rastreabilidade ponta-a-ponta |
| [TESTING.md](./TESTING.md) | Cobertura de testes unitários (`vitest`) e cenários obrigatórios de ponta-a-ponta |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Implantação em produção, execução de migrações Supabase e monitorização agendada (Cron) |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Descrição detalhada de todas as variáveis de ambiente (`.env.example`) |
| [LICENSES_AND_DEPENDENCIES.md](./LICENSES_AND_DEPENDENCIES.md) | Inventário de bibliotecas, licenças open-source e termos das APIs externas |
| [ROADMAP.md](./ROADMAP.md) | Evolução planeada P0 → P1 → P2 (INAMET, GGPEN, Multicaixa Express real, WhatsApp) |
