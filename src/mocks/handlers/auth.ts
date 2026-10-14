import { HttpResponse } from 'msw'
import { PASSWORD_RULES, type LoginInput, type Session, type SessionInfo, type SignupInput } from '@/contracts/auth'
import { CART_ID_HEADER } from '@/contracts/cart'
import { db } from '../db'
import { createSession, hashPassword, randomToken, requireUser, toPublicUser, uniqueUsername } from '../domain/auth'
import { mergeGuestCart } from '../domain/cart'
import type { UserRecord } from '../fixtures/users'
import { apiError, route } from '../http'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normalizeEmail = (email: string) => email.trim().toLowerCase()

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) as Partial<T>) ?? {}
  } catch {
    return {}
  }
}

/** Cria a sessão e leva o carrinho de visitante para a conta. */
function startSession(user: UserRecord, request: Request, status: number) {
  const { token, expiresAt } = createSession(user.id)
  const guestCartId = request.headers.get(CART_ID_HEADER)
  if (guestCartId) mergeGuestCart(guestCartId, user.id)
  return HttpResponse.json<Session>({ token, expiresAt, user: toPublicUser(user) }, { status })
}

export const authHandlers = [
  route('post', '/auth/signup', async ({ request }) => {
    const body = await readJson<SignupInput>(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const fields: Record<string, string> = {}
    if (name.length < 3) fields.name = 'Informe um nome de usuário com ao menos 3 caracteres.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (password.length < PASSWORD_RULES.minLength || !PASSWORD_RULES.pattern.test(password)) {
      fields.password = PASSWORD_RULES.message
    }
    if (Object.keys(fields).length > 0) return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)

    if (db.state.users.some((u) => u.email === email)) {
      return apiError(409, 'CONFLICT', 'Este e-mail já está cadastrado.', {
        email: 'Este e-mail já está cadastrado. Entre ou use outro e-mail.',
      })
    }

    const salt = randomToken(8)
    const user: UserRecord = {
      id: `usr_${randomToken(6)}`,
      name,
      username: uniqueUsername(name),
      email,
      ensName: null,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(salt, password),
      createdAt: new Date().toISOString(),
    }
    db.update((state) => {
      state.users.push(user)
    })
    return startSession(user, request, 201)
  }),

  route('post', '/auth/login', async ({ request }) => {
    const body = await readJson<LoginInput>(request)
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) {
      return apiError(422, 'VALIDATION_ERROR', 'Informe e-mail e senha.', {
        ...(email ? {} : { email: 'Informe seu e-mail.' }),
        ...(password ? {} : { password: 'Informe sua senha.' }),
      })
    }

    const user = db.state.users.find((u) => u.email === email)
    // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
    if (!user || (await hashPassword(user.passwordSalt, password)) !== user.passwordHash) {
      return apiError(401, 'UNAUTHENTICATED', 'E-mail ou senha incorretos.')
    }
    return startSession(user, request, 200)
  }),

  route('post', '/auth/logout', ({ request }) => {
    const auth = requireUser(request)
    // Sair com sessão já expirada também é sucesso: o objetivo é estar deslogado.
    if (!(auth instanceof Response)) {
      db.update((state) => {
        delete state.sessions[auth.token]
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  route('get', '/auth/session', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json<SessionInfo>({ expiresAt: auth.expiresAt, user: toPublicUser(auth.user) })
  }),
]
