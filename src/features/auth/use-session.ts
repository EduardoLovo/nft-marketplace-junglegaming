import { useSyncExternalStore } from 'react'
import { sessionStore } from '@/lib/auth/session-store'

/** Sessão atual, reativa a login, logout e expiração (inclusive de outra aba). */
export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}

/**
 * Dono dos dados privados no cache: o id do usuário ou "guest". Faz parte
 * das chaves de query para os dados de uma conta nunca aparecerem em outra.
 */
export function useOwnerKey() {
  return useSession()?.user.id ?? 'guest'
}
