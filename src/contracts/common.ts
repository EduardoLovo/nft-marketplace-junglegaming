/**
 * Tipos compartilhados entre a aplicação e os mocks. Representam o contrato
 * da API REST: qualquer mudança aqui é uma mudança de contrato.
 */

/** Data e hora em ISO 8601 (UTC), ex.: `"2026-10-01T12:00:00.000Z"`. */
export type IsoDateTime = string

/** Página de resultados. `page` começa em 1. */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Opção de filtro com a quantidade de resultados correspondentes. */
export interface Facet<T extends string> {
  value: T
  label: string
  count: number
}
