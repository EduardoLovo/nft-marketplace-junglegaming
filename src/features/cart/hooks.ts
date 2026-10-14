import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart } from '@/contracts/cart'
import { isApiError } from '@/lib/api/errors'
import { multiplyEth } from '@/lib/eth'
import {
  acknowledgeCartChanges,
  addCartItem,
  applyCoupon,
  cartKeys,
  cartQueryOptions,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from './api'

const CART_MUTATION_KEY = [...cartKeys.all, 'mutation'] as const

export function useCart() {
  return useQuery(cartQueryOptions())
}

/** Quantidade de unidades no carrinho (badge do header e da barra mobile). */
export function useCartCount() {
  const { data } = useCart()
  return data?.summary.itemCount ?? 0
}

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : 'Tente novamente em instantes.')

/**
 * Com várias mutações do carrinho em voo (ex.: cliques rápidos no "+"), só a
 * última aplica a resposta do servidor. As anteriores trariam um estado
 * intermediário e fariam a quantidade "voltar" na tela.
 */
function settleCart(queryClient: QueryClient, cart: Cart | undefined) {
  const isLast = queryClient.isMutating({ mutationKey: CART_MUTATION_KEY }) === 1
  if (!isLast) return
  if (cart) {
    queryClient.setQueryData(cartQueryOptions().queryKey, cart)
  } else {
    void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  }
}

/** Atualização otimista: aplica a mudança na hora e devolve o estado anterior para rollback. */
async function optimistic(queryClient: QueryClient, update: (cart: Cart) => Cart) {
  const { queryKey } = cartQueryOptions()
  await queryClient.cancelQueries({ queryKey })
  const previous = queryClient.getQueryData(queryKey)
  if (previous) queryClient.setQueryData(queryKey, update(previous))
  return { previous }
}

function rollback(queryClient: QueryClient, context: { previous?: Cart } | undefined) {
  if (context?.previous) queryClient.setQueryData(cartQueryOptions().queryKey, context.previous)
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: addCartItem,
    onError: (error) => toast.error('Não foi possível adicionar ao carrinho', { description: errorMessage(error) }),
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: ({ editionId, quantity }: { editionId: string; quantity: number }) =>
      updateCartItem(editionId, quantity),
    onMutate: ({ editionId, quantity }) =>
      optimistic(queryClient, (cart) => ({
        ...cart,
        items: cart.items.map((item) =>
          item.editionId === editionId
            ? { ...item, quantity, lineTotalEth: multiplyEth(item.unitPriceEth, quantity) }
            : item,
        ),
      })),
    onError: (error, _variables, context) => {
      rollback(queryClient, context)
      toast.error('Não foi possível alterar a quantidade', { description: errorMessage(error) })
    },
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: (editionId: string) => removeCartItem(editionId),
    onMutate: (editionId) =>
      optimistic(queryClient, (cart) => ({
        ...cart,
        items: cart.items.filter((item) => item.editionId !== editionId),
      })),
    onError: (error, _variables, context) => {
      rollback(queryClient, context)
      toast.error('Não foi possível remover o item', { description: errorMessage(error) })
    },
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: applyCoupon,
    // Erros de cupom aparecem junto ao campo, sem toast.
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: removeCoupon,
    onError: (error) => toast.error('Não foi possível remover o cupom', { description: errorMessage(error) }),
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

export function useAcknowledgeCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn: acknowledgeCartChanges,
    onError: (error) => toast.error('Não foi possível atualizar o carrinho', { description: errorMessage(error) }),
    onSettled: (cart) => settleCart(queryClient, cart),
  })
}

/** Verdadeiro enquanto qualquer alteração do carrinho aguarda o servidor. */
export function useIsCartSyncing() {
  return useIsMutating({ mutationKey: CART_MUTATION_KEY }) > 0
}
