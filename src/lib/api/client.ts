import axios from 'axios'
import { CART_ID_HEADER } from '@/contracts/cart'
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
  config.headers.set(CART_ID_HEADER, getGuestCartId())
  return config
})

// Qualquer falha chega às camadas de cima como `ApiError`, o que permite
// decidir retry, redirecionamento de sessão e mensagens num só lugar.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
