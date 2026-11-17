import { NextResponse } from 'next/server'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { loadPublicCatalog } from '@/lib/repositories/platform-repository'

/**
 * GET /api/catalog
 * Fornece culturas agrícolas, campanhas, províncias angolanas e produtos activos para o simulador e páginas públicas.
 */
export async function GET() {
  const catalog = await loadPublicCatalog()
  return NextResponse.json({
    crops: catalog.crops,
    campaigns: catalog.campaigns,
    provinces: ANGOLA_PROVINCES,
    products: catalog.products,
    storageMode: catalog.storageMode,
  })
}
