import { redirect } from 'next/navigation'
import { getAuthenticatedContext } from './session'
import type { UserRole } from '@/types/domain'

/**
 * Devolve a rota de login dedicada de cada portal.
 */
export function getLoginPathForRole(role: UserRole): string {
  if (role === 'manager') return '/admin/login'
  if (role === 'operator') return '/operations/login'
  return '/login'
}

/**
 * Devolve a rota inicial de trabalho de cada perfil.
 */
export function getHomePathForRole(role: UserRole): string {
  if (role === 'manager') return '/admin'
  if (role === 'operator') return '/operations'
  return '/dashboard'
}

/**
 * Protege layouts e Server Components exigindo autenticação e papel autorizado.
 * Redirecciona utilizadores não autenticados para a tela de login própria do portal solicitado
 * e redirecciona utilizadores de outro perfil para o respectivo portal autorizado.
 */
export async function requirePortalAccess(allowedRoles: UserRole[]) {
  const ctx = await getAuthenticatedContext()
  if (!ctx) {
    const primaryTargetRole: UserRole = allowedRoles[0] || 'farmer'
    redirect(getLoginPathForRole(primaryTargetRole))
  }
  if (!allowedRoles.includes(ctx.user.role)) {
    redirect(getHomePathForRole(ctx.user.role))
  }
  return ctx
}
