import { generateId, getDemoDatabase, saveDemoDatabase } from '@/lib/store/database'
import {
  isSupabaseConfigured,
  requireSupabaseAdminClient,
} from '@/lib/supabase/server'
import { recordAuditLog } from '@/services/audit/audit-service'
import type { PaymentRecord, UserRole } from '@/types/domain'

export interface SimulatePaymentInput {
  kind: 'premium' | 'indemnity'
  policyId: string
  eventId?: string | null
  channel: 'multicaixa_express_sim' | 'bai_directo_sim' | 'unitel_money_sim'
  simulateOutcome: 'successful' | 'failed'
  idempotencyKey: string
  actorUserId: string
  actorEmail: string
  actorRole: UserRole
}

/**
 * Executa um processamento transaccional idempotente de pagamento de prémio ou de indemnização.
 *
 * Em Produção (Supabase configurado):
 * - Verifica `idempotency_key` no PostgreSQL e trata conflitos únicos (`23505`) como replay idempotente.
 * - Valida que apólices já activas não recebem segunda cobrança de prémio e eventos já pagos não são pagos duas vezes.
 * - Persiste `payments` e `payment_transactions`, actualiza estado da apólice/evento e regista notificação + auditoria.
 */
export async function simulatePayment(input: SimulatePaymentInput): Promise<{
  payment: PaymentRecord
  idempotentReplay: boolean
  error?: string
}> {
  if (isSupabaseConfigured()) {
    const admin = requireSupabaseAdminClient()

    const { data: existingRow } = await admin
      .from('payments')
      .select('*')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle()

    const { data: polRow } = await admin
      .from('policies')
      .select('*')
      .eq('id', input.policyId)
      .maybeSingle()

    if (!polRow) {
      throw new Error('Apólice não encontrada para processamento de pagamento.')
    }

    const { data: custRow } = await admin
      .from('customers')
      .select('id, user_id, full_name')
      .eq('id', polRow.customer_id)
      .single()

    const mapRowToPayment = (row: Record<string, unknown>): PaymentRecord => ({
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      transactionReference: String(row.transaction_reference),
      kind: row.kind as PaymentRecord['kind'],
      customerId: String(row.customer_id),
      customerName: String(custRow?.full_name || 'Segurado'),
      policyId: String(row.policy_id),
      policyNumber: String(polRow.policy_number),
      eventId: row.event_id ? String(row.event_id) : null,
      amountAoa: Number(row.amount_aoa),
      channel: row.channel as PaymentRecord['channel'],
      status: row.status as PaymentRecord['status'],
      failureReason: row.failure_reason ? String(row.failure_reason) : null,
      isSimulated: true,
      createdAt: String(row.created_at),
      processedAt: row.processed_at ? String(row.processed_at) : null,
    })

    if (existingRow) {
      return {
        payment: mapRowToPayment(existingRow as Record<string, unknown>),
        idempotentReplay: true,
      }
    }

    let amountAoa = Number(polRow.premium_aoa)
    let linkedEvent: Record<string, unknown> | null = null

    if (input.kind === 'premium') {
      if (polRow.status === 'active') {
        throw new Error('Esta apólice já se encontra paga e activa.')
      }
      if (polRow.status === 'cancelled' || polRow.status === 'expired') {
        throw new Error(
          `Não é possível pagar prémio de apólice no estado "${polRow.status}".`
        )
      }
    } else {
      if (!input.eventId) {
        throw new Error('Identificador do evento climático é obrigatório.')
      }
      const { data: evRow } = await admin
        .from('climate_events')
        .select('*')
        .eq('id', input.eventId)
        .eq('policy_id', polRow.id)
        .maybeSingle()

      if (!evRow) {
        throw new Error('Evento climático não encontrado para pagamento de indemnização.')
      }
      if (
        evRow.status !== 'indemnity_calculated' &&
        evRow.status !== 'payment_pending'
      ) {
        throw new Error(
          `O evento encontra-se no estado "${evRow.status}" e não está elegível para pagamento.`
        )
      }
      const { data: indRow } = await admin
        .from('indemnity_calculations')
        .select('id, calculated_indemnity_aoa')
        .eq('event_id', evRow.id)
        .maybeSingle()

      const indAmount = Number(indRow?.calculated_indemnity_aoa ?? 0)
      if (!indRow || indAmount <= 0) {
        throw new Error(
          'Não existe valor positivo de indemnização calculado para este evento.'
        )
      }
      amountAoa = indAmount
      linkedEvent = evRow as Record<string, unknown>
    }

    const nowIso = new Date().toISOString()
    const refPrefix = input.kind === 'premium' ? 'PREM' : 'IND'
    const randomSuffix = Math.floor(100000 + Math.random() * 900000)
    const txRef = `NS-SIM-${refPrefix}-${nowIso.slice(0, 10).replaceAll('-', '')}-${randomSuffix}`
    const failureReason =
      input.simulateOutcome === 'failed'
        ? 'Falha simulada pelo utilizador para teste de tratamento de erros de pagamento.'
        : null

    const { data: insertedPay, error: payErr } = await admin
      .from('payments')
      .insert({
        idempotency_key: input.idempotencyKey,
        transaction_reference: txRef,
        kind: input.kind,
        customer_id: polRow.customer_id,
        policy_id: polRow.id,
        event_id: linkedEvent ? String(linkedEvent.id) : null,
        amount_aoa: amountAoa,
        channel: input.channel,
        status: input.simulateOutcome,
        failure_reason: failureReason,
        is_simulated: true,
        processed_at: nowIso,
      })
      .select('*')
      .single()

    if (payErr) {
      if (payErr.code === '23505') {
        const { data: replayRow } = await admin
          .from('payments')
          .select('*')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle()
        if (replayRow) {
          return {
            payment: mapRowToPayment(replayRow as Record<string, unknown>),
            idempotentReplay: true,
          }
        }
      }
      throw new Error(`[Supabase:insert_payment] ${payErr.message}`)
    }

    await admin.from('payment_transactions').insert({
      payment_id: insertedPay.id,
      gateway_name: input.channel,
      status: input.simulateOutcome,
      payload: {
        idempotencyKey: input.idempotencyKey,
        transactionReference: txRef,
        amountAoa,
        isSimulated: true,
      },
    })

    const payment = mapRowToPayment(insertedPay as Record<string, unknown>)

    if (input.simulateOutcome === 'successful') {
      if (input.kind === 'premium') {
        const prevStatus = String(polRow.status)
        await admin
          .from('policies')
          .update({
            status: 'active',
            issued_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', polRow.id)

        await admin.from('notifications').insert({
          user_id: custRow?.user_id ?? null,
          target_role: 'farmer',
          title: `Apólice ${polRow.policy_number} emitida e activa`,
          message: `Pagamento do prémio (${amountAoa.toLocaleString('pt-AO')} AOA) confirmado. O certificado digital está disponível para descarga.`,
          category: 'policy',
          is_read: false,
          related_entity_type: 'policy',
          related_entity_id: String(polRow.id),
        })

        await recordAuditLog({
          userId: input.actorUserId,
          userEmail: input.actorEmail,
          userRole: input.actorRole,
          action: 'PREMIUM_PAYMENT_SIMULATED_SUCCESS',
          entityType: 'policy',
          entityId: String(polRow.id),
          previousState: { status: prevStatus },
          newState: { status: 'active', policyNumber: polRow.policy_number },
          metadata: { transactionReference: txRef, amountAoa },
          result: 'success',
        })
      } else if (linkedEvent) {
        const prevStatus = String(linkedEvent.status)
        await admin
          .from('climate_events')
          .update({ status: 'paid', updated_at: nowIso })
          .eq('id', linkedEvent.id)

        await admin.from('notifications').insert({
          user_id: custRow?.user_id ?? null,
          target_role: 'farmer',
          title: `Indemnização paga — ${polRow.policy_number}`,
          message: `Liquidação de ${amountAoa.toLocaleString('pt-AO')} AOA concluída (Ref: ${txRef}).`,
          category: 'payment',
          is_read: false,
          related_entity_type: 'payment',
          related_entity_id: String(insertedPay.id),
        })

        await recordAuditLog({
          userId: input.actorUserId,
          userEmail: input.actorEmail,
          userRole: input.actorRole,
          action: 'INDEMNITY_PAYMENT_SIMULATED_SUCCESS',
          entityType: 'climate_event',
          entityId: String(linkedEvent.id),
          previousState: { status: prevStatus },
          newState: { status: 'paid' },
          metadata: { transactionReference: txRef, amountAoa },
          result: 'success',
        })
      }
    } else {
      await recordAuditLog({
        userId: input.actorUserId,
        userEmail: input.actorEmail,
        userRole: input.actorRole,
        action: 'PAYMENT_SIMULATED_FAILURE',
        entityType: 'payment',
        entityId: String(insertedPay.id),
        newState: { status: 'failed', reason: failureReason },
        metadata: { policyNumber: polRow.policy_number, amountAoa },
        result: 'failure',
      })
    }

    return { payment, idempotentReplay: false }
  }

  // Fallback Demonstração (para testes unitários e ambiente sem Supabase configurado)
  const db = getDemoDatabase()

  const existing = db.payments.find(
    (p) => p.idempotencyKey === input.idempotencyKey
  )
  if (existing) {
    return { payment: existing, idempotentReplay: true }
  }

  const policy = db.policies.find((p) => p.id === input.policyId)
  if (!policy) {
    throw new Error('Apólice não encontrada para processamento de pagamento.')
  }

  let amountAoa = policy.premiumAoa
  let linkedEvent = null

  if (input.kind === 'indemnity') {
    linkedEvent = db.climateEvents.find((e) => e.id === input.eventId)
    if (!linkedEvent) {
      throw new Error('Evento climático não encontrado para pagamento de indemnização.')
    }
    if (
      linkedEvent.status !== 'indemnity_calculated' &&
      linkedEvent.status !== 'payment_pending'
    ) {
      throw new Error(
        `O evento encontra-se no estado "${linkedEvent.status}" e não está elegível para pagamento.`
      )
    }
    if (!linkedEvent.calculatedIndemnityAoa || linkedEvent.calculatedIndemnityAoa <= 0) {
      throw new Error('Não existe valor positivo de indemnização calculado para este evento.')
    }
    amountAoa = linkedEvent.calculatedIndemnityAoa
  }

  const nowIso = new Date().toISOString()
  const refPrefix = input.kind === 'premium' ? 'PREM' : 'IND'
  const randomSuffix = Math.floor(100000 + Math.random() * 900000)

  const payment: PaymentRecord = {
    id: generateId('pay'),
    idempotencyKey: input.idempotencyKey,
    transactionReference: `NS-SIM-${refPrefix}-${nowIso.slice(0, 10).replaceAll('-', '')}-${randomSuffix}`,
    kind: input.kind,
    customerId: policy.customerId,
    customerName: policy.customerName,
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    eventId: linkedEvent?.id ?? null,
    amountAoa,
    channel: input.channel,
    status: input.simulateOutcome,
    failureReason:
      input.simulateOutcome === 'failed'
        ? 'Falha simulada pelo utilizador para teste de tratamento de erros de pagamento.'
        : null,
    isSimulated: true,
    createdAt: nowIso,
    processedAt: nowIso,
  }

  db.payments.unshift(payment)

  if (input.simulateOutcome === 'successful') {
    if (input.kind === 'premium') {
      const prevStatus = policy.status
      policy.status = 'active'
      policy.issuedAt = nowIso
      const customer = db.customers.find((c) => c.id === policy.customerId)
      db.notifications.unshift({
        id: generateId('notif'),
        userId: customer?.userId ?? null,
        targetRole: 'farmer',
        title: `Apólice ${policy.policyNumber} emitida e activa`,
        message: `Pagamento simulado do prémio (${amountAoa.toLocaleString('pt-AO')} AOA) confirmado. O certificado digital está disponível para descarga.`,
        category: 'policy',
        read: false,
        relatedEntityType: 'policy',
        relatedEntityId: policy.id,
        createdAt: nowIso,
      })

      await recordAuditLog({
        userId: input.actorUserId,
        userEmail: input.actorEmail,
        userRole: input.actorRole,
        action: 'PREMIUM_PAYMENT_SIMULATED_SUCCESS',
        entityType: 'policy',
        entityId: policy.id,
        previousState: { status: prevStatus },
        newState: { status: 'active', policyNumber: policy.policyNumber },
        metadata: { transactionReference: payment.transactionReference, amountAoa },
        result: 'success',
      })
    } else if (linkedEvent) {
      const prevStatus = linkedEvent.status
      linkedEvent.status = 'paid'
      linkedEvent.updatedAt = nowIso
      const customer = db.customers.find((c) => c.id === policy.customerId)
      db.notifications.unshift({
        id: generateId('notif'),
        userId: customer?.userId ?? null,
        targetRole: 'farmer',
        title: `Indemnização paga (simulada) — ${policy.policyNumber}`,
        message: `Transferência simulada de ${amountAoa.toLocaleString('pt-AO')} AOA concluída (Ref: ${payment.transactionReference}).`,
        category: 'payment',
        read: false,
        relatedEntityType: 'payment',
        relatedEntityId: payment.id,
        createdAt: nowIso,
      })

      await recordAuditLog({
        userId: input.actorUserId,
        userEmail: input.actorEmail,
        userRole: input.actorRole,
        action: 'INDEMNITY_PAYMENT_SIMULATED_SUCCESS',
        entityType: 'climate_event',
        entityId: linkedEvent.id,
        previousState: { status: prevStatus },
        newState: { status: 'paid' },
        metadata: { transactionReference: payment.transactionReference, amountAoa },
        result: 'success',
      })
    }
  } else {
    await recordAuditLog({
      userId: input.actorUserId,
      userEmail: input.actorEmail,
      userRole: input.actorRole,
      action: 'PAYMENT_SIMULATED_FAILURE',
      entityType: 'payment',
      entityId: payment.id,
      newState: { status: 'failed', reason: payment.failureReason },
      metadata: { policyNumber: policy.policyNumber, amountAoa },
      result: 'failure',
    })
  }

  saveDemoDatabase(db)
  return { payment, idempotentReplay: false }
}
