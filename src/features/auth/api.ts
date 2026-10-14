import type { LoginInput, Session, SessionInfo, SignupInput } from '@/contracts/auth'
import { apiClient } from '@/lib/api/client'

export async function login(input: LoginInput) {
  const { data } = await apiClient.post<Session>('/auth/login', input)
  return data
}

export async function signup(input: SignupInput) {
  const { data } = await apiClient.post<Session>('/auth/signup', input)
  return data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await apiClient.get<SessionInfo>('/auth/session', { signal })
  return data
}

/**
 * Raízes de chaves com dados de uma conta. Login, logout e troca de usuário
 * removem tudo isso do cache; o catálogo (público) é preservado.
 */
export const PRIVATE_QUERY_ROOTS = ['cart', 'account', 'favorites', 'orders', 'wallets', 'checkout'] as const
