import { NextRequest } from 'next/server'
import { authenticateForPortal } from '@/lib/auth/portal-auth'

/**
 * POST /api/auth/manager/login
 * Endpoint exclusivo do Portal do Gestor NOSSA Seguros (`/admin/login`).
 * Rejeita qualquer tentativa de autenticação de agricultores ou operadores por esta rota.
 */
export async function POST(req: NextRequest) {
  return authenticateForPortal(req, 'manager')
}
