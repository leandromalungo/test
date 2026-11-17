import { loadPublicCatalog } from '@/lib/repositories/platform-repository'
import { ANGOLA_PROVINCES } from '@/config/angola'
import { PresentationLanding } from '@/components/features/landing/presentation-landing'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const db = await loadPublicCatalog()
  const activeProductsCount = db.products.filter(
    (p) => p.status === 'active'
  ).length

  return (
    <PresentationLanding
      activeProductsCount={activeProductsCount}
      provincesCount={ANGOLA_PROVINCES.length}
    />
  )
}
