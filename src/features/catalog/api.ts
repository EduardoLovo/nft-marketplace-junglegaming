import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { CatalogPage, CatalogQuery, NftDetail } from '@/contracts/catalog'
import { apiClient } from '@/lib/api/client'

/** Converte a query do catálogo nos parâmetros de `GET /nfts` (listas em CSV). */
function toSearchParams(query: CatalogQuery) {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value.join(',')
    } else {
      params[key] = value
    }
  }
  return params
}

export async function fetchCatalog(query: CatalogQuery, signal?: AbortSignal) {
  const { data } = await apiClient.get<CatalogPage>('/nfts', { params: toSearchParams(query), signal })
  return data
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal })
  return data
}

/**
 * Chaves do catálogo. Todas começam com `['catalog']`, o que permite invalidar
 * listagens e detalhes de uma vez quando um NFT muda (ex.: evento em tempo real).
 */
export const catalogKeys = {
  all: ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (query: CatalogQuery) => [...catalogKeys.lists(), query] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...catalogKeys.details(), id] as const,
}

export const catalogQueryOptions = (query: CatalogQuery) =>
  queryOptions({
    queryKey: catalogKeys.list(query),
    // O `signal` cancela a requisição quando a chave muda (ex.: nova busca),
    // então uma resposta antiga nunca sobrescreve a mais recente.
    queryFn: ({ signal }) => fetchCatalog(query, signal),
    // Mantém a página anterior visível enquanto a próxima carrega, evitando
    // que a grade "pisque" para o skeleton a cada filtro.
    placeholderData: keepPreviousData,
  })

export const nftQueryOptions = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
  })
