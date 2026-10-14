import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { NftSummary } from '@/contracts/catalog'
import { useOwnerKey } from '@/features/auth/use-session'
import { isApiError } from '@/lib/api/errors'
import { apiClient } from '@/lib/api/client'

export async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await apiClient.get<NftSummary[]>('/favorites', { signal })
  return data
}

export async function setFavorite(nftId: string, favorite: boolean) {
  const url = `/favorites/${encodeURIComponent(nftId)}`
  await (favorite ? apiClient.put(url) : apiClient.delete(url))
}

export const favoriteKeys = {
  all: ['favorites'] as const,
  list: (owner: string) => [...favoriteKeys.all, owner] as const,
}

const FAVORITE_MUTATION_KEY = [...favoriteKeys.all, 'mutation'] as const

export const favoritesQueryOptions = (owner: string) =>
  queryOptions({
    queryKey: favoriteKeys.list(owner),
    queryFn: ({ signal }) => fetchFavorites(signal),
    // Visitantes não têm favoritos: nada é buscado sem sessão.
    enabled: owner !== 'guest',
  })

export function useFavorites() {
  return useQuery(favoritesQueryOptions(useOwnerKey()))
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return data?.some((nft) => nft.id === nftId) ?? false
}

/**
 * Favoritar/desfavoritar com atualização otimista: o coração muda na hora e,
 * se a API falhar, volta ao estado anterior com um aviso. Como as operações
 * são idempotentes, o usuário pode simplesmente tentar de novo.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const owner = useOwnerKey()
  const queryKey = favoriteKeys.list(owner)

  return useMutation({
    mutationKey: FAVORITE_MUTATION_KEY,
    mutationFn: ({ nft, favorite }: { nft: NftSummary; favorite: boolean }) => setFavorite(nft.id, favorite),
    onMutate: async ({ nft, favorite }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NftSummary[]>(queryKey)
      queryClient.setQueryData<NftSummary[]>(queryKey, (list = []) =>
        favorite ? [nft, ...list.filter((item) => item.id !== nft.id)] : list.filter((item) => item.id !== nft.id),
      )
      return { previous }
    },
    onError: (error, { nft, favorite }, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
      toast.error(favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos', {
        description: `${nft.name}: ${isApiError(error) ? error.message : 'tente novamente.'}`,
      })
    },
    onSuccess: (_data, { nft, favorite }) => {
      toast.success(favorite ? 'Adicionado à lista de interesse' : 'Removido da lista de interesse', {
        id: `favorite-${nft.id}`,
        description: nft.name,
      })
    },
    // Com cliques rápidos em vários corações, só a última mutação revalida a lista.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: FAVORITE_MUTATION_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
