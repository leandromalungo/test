'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Loader2 } from 'lucide-react'

export function IndemnityPayoutButton({
  policyId,
  eventId,
}: {
  policyId: string
  eventId: string
}) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'indemnity',
          policyId,
          eventId,
          channel: 'unitel_money_sim',
          simulateOutcome: 'successful',
          idempotencyKey: `ind-${eventId}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao simular pagamento de indemnização.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erro de comunicação.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={paying}
        onClick={handlePay}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#16A34A] px-3 text-xs font-medium text-white hover:bg-[#15803D] disabled:opacity-50 whitespace-nowrap"
      >
        {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        <span>Simular Pagamento Indemnização</span>
      </button>
      {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
    </div>
  )
}
