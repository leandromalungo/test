# Licenças, Dependências e Serviços Externos (`LICENSES_AND_DEPENDENCIES.md`)

## 1. Pacotes Open-Source Instalados (`package.json`)

| Pacote | Versão | Licença | Finalidade |
| --- | --- | --- | --- |
| `next` / `react` / `react-dom` | `16.4.3` / `^19` | MIT | Framework full-stack App Router e biblioteca UI |
| `@supabase/supabase-js` / `@supabase/ssr` | `^2.119.0` / `^0.12.7` | MIT | Cliente PostgreSQL/Auth e sessões SSR |
| `decimal.js` | `^10.6.0` | MIT | Aritmética financeira exacta em AOA |
| `zod` | `^4.6.7` | MIT | Validação estrita de schemas API e formulários |
| `react-hook-form` / `@hookform/resolvers` | `^7.92.0` / `^7.0.6` | MIT | Gestão de formulários |
| `@tanstack/react-table` | `^9.3.1` | MIT | Tabelas filtráveis (ex.: auditoria) |
| `recharts` | `^3.10.1` | MIT | Gráficos de precipitação e risco de base |
| `pdf-lib` | `^1.17.1` | MIT | Geração de certificados PDF de apólices no servidor |
| `lucide-react` | `^1.16.0` | ISC | Conjunto consistente de ícones vectoriais |
| `date-fns` | `^4.4.0` | MIT | Manipulação segura de datas |
| `motion` | `^14.13.0` | MIT | Animações subtis de interface |
| `tailwindcss` / `tailwind-merge` / `clsx` / `class-variance-authority` | `^4.3.3` / etc. | MIT / Apache-2.0 | Sistema de estilos utilitários |
| `vitest` | `^5.1.0` | MIT | Execução de testes unitários |

## 2. APIs Externas e Termos de Utilização

| Serviço | Custo no MVP | Termos e Restrições Conhecidas |
| --- | --- | --- |
| **Open-Meteo Archive API (ERA5)** | Gratuito para fins não comerciais / avaliação | Uso comercial em produção pela seguradora requer contratação do plano comercial Open-Meteo e atribuição CC BY 4.0 (C3S/ECMWF). Sujeito a limites de taxa por minuto. |
| **NASA POWER Daily API** | Gratuito (dados públicos NASA) | Sem custo de subscrição; sujeito a limites de concorrência da infraestrutura NASA Langley e eventual latência pontual (~2–5s). Atribuição recomendada. |
| **Supabase (PostgreSQL + Auth)** | Free Tier / Pro (~25 USD/mês em produção) | Free tier suspende projectos inactivos após 7 dias; produção exige plano Pro com backups automáticos. |
