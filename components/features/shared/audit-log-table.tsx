'use client'

import { useMemo, useState } from 'react'
import { TextInput, SelectInput } from '@/components/ui/field'
import { StatusBadge } from '@/components/ui/status-badge'
import type { AuditLogEntry } from '@/types/domain'

/**
 * Tabela administrativa de registos de auditoria imutáveis.
 * Permite filtragem imediata por acção, entidade, resultado ou utilizador responsável.
 */
export function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'blocked' | 'failure'>('all')

  const filteredLogs = useMemo(() => {
    const query = globalFilter.trim().toLowerCase()
    return logs.filter((entry) => {
      if (resultFilter !== 'all' && entry.result !== resultFilter) {
        return false
      }
      if (!query) return true
      const haystack = [
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.userEmail || 'Sistema',
        entry.userRole,
        entry.result,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [logs, globalFilter, resultFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <TextInput
            placeholder="Filtrar auditoria por acção, entidade ou e-mail..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <div className="w-48">
          <SelectInput
            aria-label="Filtrar por resultado"
            value={resultFilter}
            onChange={(e) =>
              setResultFilter(
                e.target.value as 'all' | 'success' | 'blocked' | 'failure'
              )
            }
          >
            <option value="all">Todos os resultados</option>
            <option value="success">Sucesso</option>
            <option value="blocked">Bloqueado</option>
            <option value="failure">Falha</option>
          </SelectInput>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#737373]">
            <tr>
              <th className="px-4 py-3">Data / Hora (UTC)</th>
              <th className="px-4 py-3">Acção</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#737373]">
                  Nenhum registo de auditoria encontrado.
                </td>
              </tr>
            ) : (
              filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F8F9FA]">
                  <td className="px-4 py-2.5 font-mono text-xs text-[#737373] tabular-nums">
                    {entry.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-[#171717]">
                    {entry.action}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#525252]">
                    {entry.entityType} · {entry.entityId}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#525252]">
                    {entry.userEmail || 'Sistema'} ({entry.userRole})
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={
                        entry.result === 'success'
                          ? 'Sucesso'
                          : entry.result === 'blocked'
                            ? 'Bloqueado'
                            : 'Falha'
                      }
                      tone={
                        entry.result === 'success'
                          ? 'success'
                          : entry.result === 'blocked'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
