import { requirePortalAccess } from '@/lib/auth/guards'
import { loadPlatformState } from '@/lib/repositories/platform-repository'
import { StatusBadge } from '@/components/ui/status-badge'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const ctx = await requirePortalAccess(['manager'])
  const db = await loadPlatformState({ role: 'manager', userId: ctx.user.id })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
          Clientes e Produtores Agrícolas
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Carteira de agricultores e cooperativas registados na plataforma ({db.customers.length} registos).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">Nome / Entidade</th>
              <th className="px-4 py-3">NIF</th>
              <th className="px-4 py-3">Província · Município</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado KYC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {db.customers.map((c) => (
              <tr key={c.id} className="hover:bg-[#F8F9FA]">
                <td className="px-4 py-3 font-medium text-[#171717]">{c.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#525252]">{c.nif}</td>
                <td className="px-4 py-3 text-xs text-[#525252]">
                  {c.province} · {c.municipality}
                </td>
                <td className="px-4 py-3 text-xs text-[#737373]">
                  {c.phone} · {c.email}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={c.kycStatus === 'verified' ? 'Verificado' : 'Pendente'}
                    tone={c.kycStatus === 'verified' ? 'success' : 'warning'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
