'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Download, Loader2 } from 'lucide-react'
import type { InsurancePolicy } from '@/types/domain'

export function PolicyActions({ policy }: { policy: InsurancePolicy }) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayNow() {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'premium',
          policyId: policy.id,
          channel: 'multicaixa_express_sim',
          simulateOutcome: 'successful',
          idempotencyKey: `prem-${policy.id}-${Date.now()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao processar pagamento simulado.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erro de comunicação ao simular pagamento.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/api/policies/${policy.id}/document`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Descarregar Apólice PDF</span>
        </a>

        {policy.status === 'pending_payment' && (
          <button
            type="button"
            disabled={paying}
            onClick={handlePayNow}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {paying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            <span>
              {paying ? 'A processar...' : 'Simular Pagamento e Activar'}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
