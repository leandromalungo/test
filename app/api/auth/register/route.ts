import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validation/schemas'
import { checkRateLimitDistributed } from '@/lib/security/rate-limit'
import {
  enforceCsrfProtection,
  enforceJsonContentType,
  getClientIp,
  NO_STORE_SECURITY_HEADERS,
} from '@/lib/security/request-security'
import {
  createSignedSessionToken,
  DEMO_SESSION_COOKIE,
  getAuthCookieOptions,
  NO_STORE_AUTH_HEADERS,
} from '@/lib/auth/session'
import {
  generateId,
  getDemoDatabase,
  hashDemoPassword,
  saveDemoDatabase,
} from '@/lib/store/database'
import {
  isSupabaseConfigured,
  requireSupabaseAdminClient,
} from '@/lib/supabase/server'
import { recordAuditLog } from '@/services/audit/audit-service'

/**
 * POST /api/auth/register
 * Regista um novo agricultor (perfil `farmer`), cria o registo de cliente associado
 * e grava evento de auditoria.
 */
export async function POST(req: NextRequest) {
  const csrfError = enforceCsrfProtection(req)
  if (csrfError) return csrfError

  const contentTypeError = enforceJsonContentType(req)
  if (contentTypeError) return contentTypeError

  const ip = getClientIp(req)
  const rate = await checkRateLimitDistributed(`register:${ip}`, 10, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Demasiados registos num curto intervalo. Tente novamente mais tarde.',
      },
      { status: 429, headers: NO_STORE_AUTH_HEADERS }
    )
  }

  try {
    const body: unknown = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Dados de registo inválidos.',
        },
        { status: 400, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const input = parsed.data
    const normalizedEmail = input.email.trim().toLowerCase()
    const normalizedNif = input.nif.trim()
    const nowIso = new Date().toISOString()

    if (isSupabaseConfigured()) {
      const admin = requireSupabaseAdminClient()

      const { data: existingNif } = await admin
        .from('customers')
        .select('id')
        .ilike('nif', normalizedNif)
        .maybeSingle()

      if (existingNif) {
        return NextResponse.json(
          { error: 'Já existe um produtor registado com este NIF.' },
          { status: 409, headers: NO_STORE_SECURITY_HEADERS }
        )
      }

      const { data: existingEmail } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle()

      if (existingEmail) {
        return NextResponse.json(
          {
            error:
              'Já existe uma conta registada com este endereço de e-mail.',
          },
          { status: 409, headers: NO_STORE_SECURITY_HEADERS }
        )
      }

      const { data: createdUser, error: authErr } =
        await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: input.password,
          email_confirm: true,
        })

      if (authErr || !createdUser.user) {
        const msg = authErr?.message || 'Não foi possível criar utilizador.'
        const isDuplicate = msg.toLowerCase().includes('already')
        return NextResponse.json(
          {
            error: isDuplicate
              ? 'Já existe uma conta registada com este endereço de e-mail.'
              : msg,
          },
          { status: isDuplicate ? 409 : 400, headers: NO_STORE_SECURITY_HEADERS }
        )
      }

      const uid = createdUser.user.id

      try {
        const { error: profErr } = await admin.from('profiles').insert({
          id: uid,
          email: normalizedEmail,
          full_name: input.fullName,
          phone: input.phone,
          nif: normalizedNif,
          province: input.province,
          municipality: input.municipality,
        })
        if (profErr) throw new Error(profErr.message)

        const { error: roleErr } = await admin
          .from('user_roles')
          .insert({ user_id: uid, role: 'farmer' })
        if (roleErr) throw new Error(roleErr.message)

        const { data: custRow, error: custErr } = await admin
          .from('customers')
          .insert({
            user_id: uid,
            full_name: input.fullName,
            email: normalizedEmail,
            phone: input.phone,
            nif: normalizedNif,
            province: input.province,
            municipality: input.municipality,
            farmer_category: input.farmerCategory,
          })
          .select('id')
          .single()
        if (custErr || !custRow) {
          throw new Error(custErr?.message || 'Erro ao criar cliente.')
        }

        await admin.from('notifications').insert({
          user_id: uid,
          target_role: 'farmer',
          title: 'Bem-vindo à plataforma NOSSA AgroParamétrico',
          message:
            'A sua conta de agricultor foi criada. Registe a sua primeira lavra para simular uma cobertura.',
          category: 'system',
          is_read: false,
          related_entity_type: 'customer',
          related_entity_id: custRow.id,
        })

        await recordAuditLog({
          userId: uid,
          userEmail: normalizedEmail,
          userRole: 'farmer',
          action: 'FARMER_REGISTERED',
          entityType: 'customer',
          entityId: custRow.id,
          newState: {
            fullName: input.fullName,
            province: input.province,
            municipality: input.municipality,
          },
          result: 'success',
        })

        return NextResponse.json(
          {
            message: 'Registo concluído no Supabase. Pode iniciar sessão.',
            userId: uid,
            authMode: 'supabase',
          },
          { status: 201, headers: NO_STORE_AUTH_HEADERS }
        )
      } catch (dbErr) {
        // Reverte o utilizador no Auth caso falhe a gravação relacional
        await admin.auth.admin.deleteUser(uid)
        throw dbErr
      }
    }

    const db = getDemoDatabase()
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json(
        { error: 'Já existe uma conta registada com este endereço de e-mail.' },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }
    if (
      db.customers.some(
        (c) => c.nif.toLowerCase() === normalizedNif.toLowerCase()
      )
    ) {
      return NextResponse.json(
        { error: 'Já existe um produtor registado com este NIF.' },
        { status: 409, headers: NO_STORE_SECURITY_HEADERS }
      )
    }

    const userId = generateId('usr-farmer')
    const customerId = generateId('cust')

    const newUser = {
      id: userId,
      email: normalizedEmail,
      fullName: input.fullName,
      phone: input.phone,
      nif: normalizedNif,
      province: input.province,
      municipality: input.municipality,
      role: 'farmer' as const,
      createdAt: nowIso,
      passwordHash: hashDemoPassword(input.password),
    }

    const newCustomer = {
      id: customerId,
      userId,
      fullName: input.fullName,
      email: normalizedEmail,
      phone: input.phone,
      nif: normalizedNif,
      province: input.province,
      municipality: input.municipality,
      farmerCategory: input.farmerCategory,
      kycStatus: 'verified' as const,
      createdAt: nowIso,
    }

    db.users.push(newUser)
    db.customers.push(newCustomer)
    db.notifications.unshift({
      id: generateId('notif'),
      userId,
      targetRole: 'farmer',
      title: 'Bem-vindo à plataforma NOSSA AgroParamétrico',
      message:
        'A sua conta de agricultor foi criada. Registe a sua primeira lavra para simular uma cobertura.',
      category: 'system',
      read: false,
      relatedEntityType: 'customer',
      relatedEntityId: customerId,
      createdAt: nowIso,
    })
    saveDemoDatabase(db)

    await recordAuditLog({
      userId,
      userEmail: normalizedEmail,
      userRole: 'farmer',
      action: 'FARMER_REGISTERED',
      entityType: 'customer',
      entityId: customerId,
      newState: {
        fullName: newCustomer.fullName,
        province: newCustomer.province,
        municipality: newCustomer.municipality,
      },
      result: 'success',
    })

    const token = createSignedSessionToken(userId, 'farmer')
    const { passwordHash: _ignored, ...safeUser } = newUser
    void _ignored

    const response = NextResponse.json(
      { user: safeUser, customer: newCustomer, authMode: 'demonstration' },
      { status: 201, headers: NO_STORE_AUTH_HEADERS }
    )
    response.cookies.set(DEMO_SESSION_COOKIE, token, getAuthCookieOptions())
    return response
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao registar agricultor.' },
      { status: 500, headers: NO_STORE_AUTH_HEADERS }
    )
  }
}
