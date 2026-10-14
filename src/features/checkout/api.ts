import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IDEMPOTENCY_HEADER,
  isTerminalStatus,
  type CreateOrderInput,
  type Order,
  type Quote,
  type QuoteInput,
} from '@/contracts/checkout'
import { useOwnerKey } from '@/features/auth/use-session'
import { catalogKeys } from '@/features/catalog/api'
import { cartKeys } from '@/features/cart/api'
import { isApiError } from '@/lib/api/errors'
import { apiClient } from '@/lib/api/client'

export async function createQuote(input: QuoteInput) {
  const { data } = await apiClient.post<Quote>('/checkout/quote', input)
  return data
}

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  const { data } = await apiClient.post<Order>('/orders', input, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  })
  return data
}

export async function fetchOrder(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function fetchOrders(signal?: AbortSignal) {
  const { data } = await apiClient.get<Order[]>('/orders', { signal })
  return data
}

export const orderKeys = {
  all: ['orders'] as const,
  list: (owner: string) => [...orderKeys.all, owner, 'list'] as const,
  detail: (owner: string, id: string) => [...orderKeys.all, owner, 'detail', id] as const,
}

/** Rede de segurança caso um evento se perca; o caminho normal é o `order.updated`. */
const PENDING_POLL_MS = 10_000

export const orderQueryOptions = (owner: string, id: string) =>
  queryOptions({
    queryKey: orderKeys.detail(owner, id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    // O status chega por `order.updated`; enquanto pendente, uma consulta
    // esparsa cobre eventos perdidos. Estados finais nunca mudam.
    refetchInterval: (query) => (query.state.data && !isTerminalStatus(query.state.data.status) ? PENDING_POLL_MS : false),
    staleTime: (query) => (query.state.data && isTerminalStatus(query.state.data.status) ? Infinity : 0),
  })

export const ordersQueryOptions = (owner: string) =>
  queryOptions({ queryKey: orderKeys.list(owner), queryFn: ({ signal }) => fetchOrders(signal) })

export function useOrders() {
  return useQuery(ordersQueryOptions(useOwnerKey()))
}

export function useCreateQuote() {
  return useMutation({ mutationFn: createQuote })
}

const MAX_ORDER_RETRIES = 3

/**
 * Criação do pedido. Por ser idempotente (mesma chave = mesmo pedido), repetir
 * após timeout ou queda de conexão é seguro: se o primeiro envio chegou ao
 * servidor, a nova tentativa devolve o pedido já criado em vez de duplicar.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const owner = useOwnerKey()
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }) =>
      createOrder(input, idempotencyKey),
    retry: (failureCount, error) => failureCount < MAX_ORDER_RETRIES && isApiError(error) && error.isTransient,
    retryDelay: 1_000,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(owner, order.id), order)
      void queryClient.invalidateQueries({ queryKey: orderKeys.list(owner) })
    },
  })
}

/** Ao concluir um pedido, carrinho e catálogo (estoque) mudaram no servidor. */
export function refreshAfterSettlement(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  void queryClient.invalidateQueries({ queryKey: orderKeys.all })
}
