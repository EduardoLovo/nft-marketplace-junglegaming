import type { User } from '@/contracts/auth'
import { db } from '../db'
import { getMockConfig } from '../config'
import type { UserRecord } from '../fixtures/users'
import { apiError } from '../http'

export interface SessionRecord {
  userId: string
  expiresAt: string
}

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')

/** SHA-256 de `salt:senha`. Num backend real seria um KDF lento (argon2/bcrypt). */
export async function hashPassword(salt: string, password: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export function randomToken(bytes = 24) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
}

export function toPublicUser(record: UserRecord): User {
  const { id, name, username, email, ensName, avatarUrl, createdAt } = record
  return { id, name, username, email, ensName, avatarUrl, createdAt }
}

export function createSession(userId: string) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + getMockConfig().sessionTtlMs).toISOString()
  db.update((state) => {
    state.sessions[token] = { userId, expiresAt }
  })
  return { token, expiresAt }
}

function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export type AuthResult =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: UserRecord; token: string; expiresAt: string }
  | { kind: 'rejected'; response: Response }

/**
 * Identifica o usuário da requisição. Um token presente mas inválido ou
 * expirado é rejeitado (401), nunca tratado como visitante: assim o cliente
 * sabe que a sessão caiu em vez de ver silenciosamente os dados de outro dono.
 */
export function authenticate(request: Request): AuthResult {
  const token = bearerToken(request)
  if (!token) return { kind: 'anonymous' }

  const session = db.state.sessions[token]
  if (!session) {
    return { kind: 'rejected', response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.') }
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    db.update((state) => {
      delete state.sessions[token]
    })
    return { kind: 'rejected', response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  const user = db.state.users.find((u) => u.id === session.userId)
  if (!user) {
    return { kind: 'rejected', response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.') }
  }
  return { kind: 'authenticated', user, token, expiresAt: session.expiresAt }
}

/** Para rotas privadas: devolve o usuário ou a resposta 401 pronta. */
export function requireUser(request: Request): { user: UserRecord; token: string; expiresAt: string } | Response {
  const auth = authenticate(request)
  if (auth.kind === 'authenticated') return auth
  if (auth.kind === 'rejected') return auth.response
  return apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
}

/** Encerra todas as sessões ativas (controle de teste para simular expiração). */
export function expireAllSessions() {
  db.update((state) => {
    for (const session of Object.values(state.sessions)) {
      session.expiresAt = new Date(Date.now() - 1_000).toISOString()
    }
  })
}

/** Nome de usuário livre derivado do nome (`Ana Souza` → `ana.souza`, `ana.souza2`...). */
export function uniqueUsername(name: string) {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 26) || 'colecionador'
  let candidate = base
  for (let n = 2; db.state.users.some((u) => u.username === candidate); n++) candidate = `${base}${n}`
  return candidate
}
