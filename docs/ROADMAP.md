# Roadmap Evolutivo (`ROADMAP.md`)

## Fase P0 — MVP Essencial (Concluído neste Repositório)
- Portais isolados por perfil (`farmer`, `manager`, `operator`) com RBAC server-side e RLS.
- Cadastro de propriedades em Angola com validação geográfica (`ANGOLA_BOUNDS`).
- Produtos paramétricos versionados e congelamento imutável de termos na apólice.
- Simulador e cálculo de prémios/indemnizações no servidor com `Decimal.js`.
- Integração climática real **Open-Meteo ERA5** e **NASA POWER**, validação estrita (`null` != `0 mm`) e comparação cruzada.
- Motor de gatilhos com prevenção de duplicação, painel de excepções, pagamentos simulados idempotentes, PDF via `pdf-lib`, análise de risco de base e auditoria imutável.

## Fase P1 — Consolidação Técnica e Piloto Operacional
- Persistência completa 1:1 com Supabase em ambiente homologado de piloto (Huambo e Huíla).
- Envio automático de alertas por e-mail transaccional aquando de emissão de apólice e activação de gatilho.
- Testes E2E automatizados (Playwright) sobre fluxos críticos dos 3 portais.
- Calibração actuarial específica por município com séries de 20 anos.

## Fase P2 — Integrações Institucionais e Produção em Escala (Angola)
- **Pagamentos Reais:** integração com API oficial **Multicaixa Express (EMIS)**, **Unitel Money** e transferências bancárias via BAI/BFA.
- **Fontes Meteorológicas Nacionais:** protocolo técnico com **INAMET** (estações sinópticas locais) e **GGPEN** (imagens de satélite nacionais), além de pipeline raster **CHIRPS** (~5 km) para redução do risco de base espacial.
- **Comunicação Rural:** notificações via **WhatsApp Business API** e SMS em português para produtores em zonas de baixa conectividade.
- **Conformidade Regulatória:** submissão técnica de notas actuariais à **ARSEG** (Agência Angolana de Regulação e Supervisão de Seguros).
