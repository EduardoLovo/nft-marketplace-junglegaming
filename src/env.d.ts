interface ImportMetaEnv {
  /** URL base da API REST. Padrão: `/api` (interceptado pelo MSW). */
  readonly VITE_API_BASE_URL?: string
  /** `"false"` desliga o MSW. Qualquer outro valor (ou ausência) mantém os mocks ativos. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Origem do servidor Socket.IO. Padrão: a própria origem da página (interceptada pelo MSW). */
  readonly VITE_SOCKET_URL?: string
  /** Timeout das requisições REST, em ms. Padrão: 10000. */
  readonly VITE_API_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
