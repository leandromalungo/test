import { NextRequest } from 'next/server'
import { authenticateForPortal } from '@/lib/auth/portal-auth'

/**
 * POST /api/auth/farmer/login
 * Endpoint exclusivo do Portal do Agricultor (`/login`).
 * Rejeita qualquer tentativa de autenticação de gestores ou operadores por esta rota.
 */
export async function POST(req: NextRequest) {
  return authenticateForPortal(req, 'farmer')
}
