import { isAxiosError, isCancel } from 'axios'

/**
 * Códigos de erro do contrato REST. A API responde sempre com o envelope
 * `ApiErrorBody`; os códigos de cliente (`NETWORK_ERROR`, `TIMEOUT`,
 * `CANCELED`) são gerados localmente quando não há resposta.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELED'
  | 'UNKNOWN'

/** Envelope de erro devolvido pela API. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Mensagens por campo em erros de validação (ex.: `{ email: '...' }`). */
    fields?: Record<string, string>
  }
}

/** Erro normalizado de qualquer falha HTTP, usado por toda a camada de dados. */
export class ApiError extends Error {
  readonly status: number | null
  readonly code: ApiErrorCode
  readonly fields: Record<string, string>

  constructor(params: {
    message: string
    code: ApiErrorCode
    status?: number | null
    fields?: Record<string, string>
    cause?: unknown
  }) {
    super(params.message, { cause: params.cause })
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status ?? null
    this.fields = params.fields ?? {}
  }

  /**
   * Falhas que podem dar certo numa nova tentativa: sem conexão, timeout,
   * limite de requisições e erros 5xx. Erros 4xx são definitivos.
   */
  get isTransient(): boolean {
    if (this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT') return true
    if (this.status === null) return false
    return this.status === 408 || this.status === 429 || this.status >= 500
  }

  get isAuthError(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const codeByStatus: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorBody).error?.code === 'string'
  )
}

/** Converte qualquer erro lançado pelo Axios em `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error

  if (isCancel(error)) {
    return new ApiError({ code: 'CANCELED', message: 'Requisição cancelada.', cause: error })
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        code: 'TIMEOUT',
        message: 'O servidor demorou para responder. Tente novamente.',
        cause: error,
      })
    }

    const response = error.response
    if (!response) {
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar. Verifique sua conexão.',
        cause: error,
      })
    }

    if (isApiErrorBody(response.data)) {
      const { code, message, fields } = response.data.error
      return new ApiError({ code, message, fields, status: response.status, cause: error })
    }

    return new ApiError({
      code: codeByStatus[response.status] ?? (response.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN'),
      message: 'Algo deu errado. Tente novamente.',
      status: response.status,
      cause: error,
    })
  }

  return new ApiError({ code: 'UNKNOWN', message: 'Erro inesperado.', cause: error })
}
