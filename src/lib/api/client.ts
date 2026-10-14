import axios from 'axios'
import { toApiError } from './errors'

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

// Qualquer falha chega às camadas de cima como `ApiError`, o que permite
// decidir retry, redirecionamento de sessão e mensagens num só lugar.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
