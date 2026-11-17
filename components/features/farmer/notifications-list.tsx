'use client'

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import type { PlatformNotification } from '@/types/domain'

export function NotificationsList({
  initialItems,
}: {
  initialItems: PlatformNotification[]
}) {
  const [items, setItems] = useState(initialItems)

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#737373]">
          {items.filter((i) => !i.read).length} não lidas
        </p>
        {items.some((i) => !i.read) && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#F8F9FA]"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-8 text-center text-sm text-[#737373]">
          Não existem notificações registadas.
        </div>
      ) : (
        <div className="divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB] bg-white">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${n.read ? 'bg-white' : 'bg-[#F8F9FA]'}`}
            >
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#171717]">{n.title}</p>
                  <span className="font-mono text-xs text-[#737373] tabular-nums">
                    {n.createdAt.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#737373]">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
