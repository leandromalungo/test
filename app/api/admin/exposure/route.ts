import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/session'
import { NO_STORE_SECURITY_HEADERS } from '@/lib/security/request-security'
import { loadPlatformState } from '@/lib/repositories/platform-repository'

/**
 * GET /api/admin/exposure
 * Agrega exposição financeira por província, cultura e tipo de cobertura.
 */
export async function GET() {
  const auth = await requireRole(['manager'])
  if (!auth.ok) return auth.response

  const state = await loadPlatformState({
    role: auth.context.user.role,
    userId: auth.context.user.id,
  })
  const activePolicies = state.policies.filter((p) => p.status === 'active')

  const byProvinceMap = new Map<
    string,
    { province: string; policiesCount: number; capitalAoa: number; premiumsAoa: number }
  >()
  const byCropMap = new Map<
    string,
    { cropName: string; policiesCount: number; capitalAoa: number }
  >()

  for (const p of activePolicies) {
    const prov = byProvinceMap.get(p.province) || {
      province: p.province,
      policiesCount: 0,
      capitalAoa: 0,
      premiumsAoa: 0,
    }
    prov.policiesCount += 1
    prov.capitalAoa += p.insuredCapitalAoa
    prov.premiumsAoa += p.premiumAoa
    byProvinceMap.set(p.province, prov)

    const cr = byCropMap.get(p.cropName) || {
      cropName: p.cropName,
      policiesCount: 0,
      capitalAoa: 0,
    }
    cr.policiesCount += 1
    cr.capitalAoa += p.insuredCapitalAoa
    byCropMap.set(p.cropName, cr)
  }

  return NextResponse.json(
    {
      byProvince: Array.from(byProvinceMap.values()).sort(
        (a, b) => b.capitalAoa - a.capitalAoa
      ),
      byCrop: Array.from(byCropMap.values()).sort(
        (a, b) => b.capitalAoa - a.capitalAoa
      ),
      totalActiveCapitalAoa: activePolicies.reduce(
        (sum, p) => sum + p.insuredCapitalAoa,
        0
      ),
    },
    { headers: NO_STORE_SECURITY_HEADERS }
  )
}
