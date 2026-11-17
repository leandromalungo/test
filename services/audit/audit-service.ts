import { generateId, getDemoDatabase, saveDemoDatabase } from '@/lib/store/database'
import {
  isSupabaseConfigured,
  requireSupabaseAdminClient,
} from '@/lib/supabase/server'
import type { AuditLogEntry, UserRole } from '@/types/domain'

export interface AuditInput {
  userId: string | null
  userEmail: string | null
  userRole: UserRole | 'system'
  action: string
  entityType: string
  entityId: string
  previousState?: Record<string, unknown> | null
  newState?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  result?: 'success' | 'failure' | 'blocked'
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Regista um evento imutável de auditoria para rastreabilidade completa das operações críticas.
 * Os registos de auditoria nunca podem ser editados ou removidos (protegidos por RLS e trigger SQL).
 */
export async function recordAuditLog(input: AuditInput): Promise<AuditLogEntry> {
  const nowIso = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabaseAdmin = requireSupabaseAdminClient()
    const safeUserId =
      input.userId && UUID_REGEX.test(input.userId) ? input.userId : null

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: safeUserId,
        user_email: input.userEmail,
        user_role: input.userRole,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        previous_state: input.previousState ?? null,
        new_state: input.newState ?? null,
        metadata: input.metadata ?? {},
        result: input.result ?? 'success',
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(`[Supabase:audit_logs] ${error.message}`)
    }

    return {
      id: String(data.id),
      userId: data.user_id ? String(data.user_id) : null,
      userEmail: data.user_email ? String(data.user_email) : null,
      userRole: data.user_role as UserRole | 'system',
      action: String(data.action),
      entityType: String(data.entity_type),
      entityId: String(data.entity_id),
      previousState: (data.previous_state as Record<string, unknown> | null) ?? null,
      newState: (data.new_state as Record<string, unknown> | null) ?? null,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
      result: data.result as AuditLogEntry['result'],
      timestamp: String(data.created_at),
    }
  }

  const entry: AuditLogEntry = {
    id: generateId('aud'),
    userId: input.userId,
    userEmail: input.userEmail,
    userRole: input.userRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    metadata: input.metadata ?? {},
    result: input.result ?? 'success',
    timestamp: nowIso,
  }

  const db = getDemoDatabase()
  db.auditLogs.unshift(entry)
  saveDemoDatabase(db)

  return entry
}

/**
 * Consulta o histórico imutável de auditoria com ordenação cronológica inversa.
 */
export async function listAuditLogs(filters?: {
  entityType?: string
  action?: string
  limit?: number
}): Promise<AuditLogEntry[]> {
  if (isSupabaseConfigured()) {
    const supabaseAdmin = requireSupabaseAdminClient()
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }
    query = query.limit(filters?.limit ?? 150)

    const { data, error } = await query
    if (error) {
      throw new Error(`[Supabase:list_audit_logs] ${error.message}`)
    }

    return (data || []).map((row) => ({
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : null,
      userEmail: row.user_email ? String(row.user_email) : null,
      userRole: row.user_role as UserRole | 'system',
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      previousState: (row.previous_state as Record<string, unknown> | null) ?? null,
      newState: (row.new_state as Record<string, unknown> | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      result: row.result as AuditLogEntry['result'],
      timestamp: String(row.created_at),
    }))
  }

  const db = getDemoDatabase()
  let logs = [...db.auditLogs]

  if (filters?.entityType) {
    logs = logs.filter((l) => l.entityType === filters.entityType)
  }
  if (filters?.action) {
    logs = logs.filter((l) =>
      l.action.toLowerCase().includes(filters.action!.toLowerCase())
    )
  }

  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return filters?.limit ? logs.slice(0, filters.limit) : logs
}
