interface ImportMetaEnv {
  /** URL base da API REST. Padrão: `/api` (interceptado pelo MSW). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
