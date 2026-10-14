import axios from 'axios'
import { CART_ID_HEADER } from '@/contracts/cart'
import { getAccessToken, sessionStore } from '@/lib/auth/session-store'
import { toApiError } from './errors'
import { getGuestCartId } from './identity'

/**
 * Cliente HTTP único da aplicação: toda chamada REST passa por aqui.
 * Em desenvolvimento, demo e testes as respostas vêm do MSW, que intercepta
 * as requisições na camada de rede. Este módulo não conhece os mocks.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  // O id de visitante segue sempre: no login o servidor o usa para levar o
  // carrinho de visitante para a conta.
  config.headers.set(CART_ID_HEADER, getGuestCartId())
  const token = getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// Qualquer falha chega às camadas de cima como `ApiError`, o que permite
// decidir retry, redirecionamento de sessão e mensagens num só lugar.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    // 401 numa requisição que levava token = a sessão caiu no servidor.
    // Só encerra se o token rejeitado ainda é o atual (uma resposta atrasada
    // de uma sessão antiga não derruba a sessão nova).
    const sentToken = axios.isAxiosError(error)
      ? String(error.config?.headers?.Authorization ?? '').replace('Bearer ', '')
      : ''
    if (apiError.isAuthError && sentToken && sentToken === getAccessToken()) {
      sessionStore.end('expired')
    }
    return Promise.reject(apiError)
  },
)
