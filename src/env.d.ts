interface ImportMetaEnv {
  /** URL base da API REST. Padrão: `/api` (interceptado pelo MSW). */
  readonly VITE_API_BASE_URL?: string
  /** `"false"` desliga o MSW. Qualquer outro valor (ou ausência) mantém os mocks ativos. */
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
