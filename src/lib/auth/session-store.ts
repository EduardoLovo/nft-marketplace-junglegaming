import type { Session, User } from '@/contracts/auth'

/**
 * Sessão do usuário no navegador: token, expiração e dados públicos do
 * usuário. Persistida para sobreviver a refresh. A senha nunca passa por aqui.
 *
 * Num backend real o token ficaria num cookie `httpOnly`, fora do alcance do
 * JavaScript; com o backend simulado, o localStorage cumpre esse papel.
 */
export interface SessionState {
  token: string
  expiresAt: string
  user: User
}

/** Por que a sessão terminou: o app decide se avisa e para onde leva o usuário. */
export type SessionEndReason = 'logout' | 'expired'

type Listener = () => void

const STORAGE_KEY = 'kurio:session'

function read(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState
    // Uma sessão vencida enquanto a aba estava fechada não é restaurada.
    return Date.parse(parsed.expiresAt) > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function write(state: SessionState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem storage, a sessão vale só nesta aba.
  }
}

let current: SessionState | null = read()
let lastEndReason: SessionEndReason | null = null
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export const sessionStore = {
  get: () => current,

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  start(session: Session) {
    current = { token: session.token, expiresAt: session.expiresAt, user: session.user }
    lastEndReason = null
    write(current)
    emit()
  },

  /** Atualiza os dados do usuário (ex.: após editar o perfil), mantendo o token. */
  updateUser(user: User) {
    if (!current) return
    current = { ...current, user }
    write(current)
    emit()
  },

  end(reason: SessionEndReason) {
    if (!current) return
    current = null
    lastEndReason = reason
    write(null)
    emit()
  },

  /** Motivo do último encerramento, consumido uma única vez (ex.: aviso de expiração). */
  consumeEndReason() {
    const reason = lastEndReason
    lastEndReason = null
    return reason
  },
}

// Login/logout em outra aba refletem nesta.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    current = read()
    emit()
  })
}

export const getAccessToken = () => current?.token ?? null
