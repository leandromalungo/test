import { NextRequest } from 'next/server'
import { authenticateForPortal } from '@/lib/auth/portal-auth'

/**
 * POST /api/auth/operator/login
 * Endpoint exclusivo do Portal de Operações & Qualidade (`/operations/login`).
 * Rejeita qualquer tentativa de autenticação de agricultores ou gestores por esta rota.
 */
export async function POST(req: NextRequest) {
  return authenticateForPortal(req, 'operator')
}
