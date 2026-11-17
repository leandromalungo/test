# Autenticação e Gestão de Sessões

A plataforma implementa **três fluxos e telas de autenticação totalmente isolados**, sem partilha de componentes de login, estados ou endpoints entre perfis:

| Perfil | Tela de Login Dedicada | Endpoint Exclusivo (`POST`) | Portal de Destino |
| --- | --- | --- | --- |
| **Agricultor** | `/login` (`FarmerLoginForm`) | `/api/auth/farmer/login` | `/dashboard` |
| **Gestor (NOSSA Seguros)** | `/admin/login` (`ManagerLoginForm`) | `/api/auth/manager/login` | `/admin` |
| **Operador (Qualidade)** | `/operations/login` (`OperatorLoginForm`) | `/api/auth/operator/login` | `/operations` |

O antigo endpoint unificado `/api/auth/login` encontra-se desactivado (`403`), impedindo autenticação transversal.

## 1. Camadas de Validação por Portal (`lib/auth/portal-auth.ts`)

1. **Validação de Origem (CSRF) & Content-Type:** rejeita pedidos de origem externa (`Origin !== Host`) com `403` e exige `application/json` (`415`).
2. **Schema Estrito (`loginSchema.strict()`):** rejeita qualquer propriedade inesperada injectada no payload (como `role` ou `isAdmin`), valida formato de e-mail (`<= 254` caracteres) e exige palavra-passe entre 8 e 128 caracteres.
3. **Rate Limiting + Bloqueio Anti-Força-Bruta:** limita pedidos por IP e bloqueia temporariamente (15 min) contas que excedam 5 tentativas falhadas em portais internos (`manager` / `operator`) ou 8 no portal do agricultor, registando `PORTAL_LOGIN_LOCKOUT` na auditoria.
4. **Vinculação Rígida de Papel + Anti-Enumeração:** se uma conta de Agricultor tentar autenticar-se em `/admin/login` ou `/operations/login` (ou vice-versa), o servidor recusa o acesso com mensagem uniforme (`401`) sem revelar se o e-mail existe noutra área, termina qualquer sessão Supabase aberta e regista `PORTAL_LOGIN_ROLE_MISMATCH` na auditoria.
5. **Segurança de Sessão e Cabeçalhos:** cookies `HttpOnly`, `SameSite=Lax`, `Secure` em produção, assinados com HMAC-SHA256 (`timingSafeEqual`) contendo vínculo explícito `portal === role` e `jti`, acompanhados de `Cache-Control: no-store` e metadados `noindex` nas páginas internas `/admin/login` e `/operations/login`.

## 2. Protecção de Rotas e Portais (`lib/auth/guards.ts`)

- Cada portal utiliza um Route Group protegido (`/app/admin/(protected)/layout.tsx`, `/app/operations/(protected)/layout.tsx` e `/app/dashboard/layout.tsx`) com `requirePortalAccess(...)` no servidor (`force-dynamic`).
- Utilizadores não autenticados são redireccionados exclusivamente para a tela de login do portal pretendido (`/login`, `/admin/login` ou `/operations/login`).
- Ao terminar sessão (`POST /api/auth/logout`), o utilizador é redireccionado para a tela de login própria do seu perfil.
