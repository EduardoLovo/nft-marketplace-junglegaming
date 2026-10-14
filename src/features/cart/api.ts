import { queryOptions } from '@tanstack/react-query'
import type { AddCartItemInput, Cart } from '@/contracts/cart'
import { apiClient } from '@/lib/api/client'

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await apiClient.get<Cart>('/cart', { signal })
  return data
}

export async function addCartItem(input: AddCartItemInput) {
  const { data } = await apiClient.post<Cart>('/cart/items', input)
  return data
}

export async function updateCartItem(editionId: string, quantity: number) {
  const { data } = await apiClient.patch<Cart>(`/cart/items/${encodeURIComponent(editionId)}`, { quantity })
  return data
}

export async function removeCartItem(editionId: string) {
  const { data } = await apiClient.delete<Cart>(`/cart/items/${encodeURIComponent(editionId)}`)
  return data
}

export async function applyCoupon(code: string) {
  const { data } = await apiClient.post<Cart>('/cart/coupon', { code })
  return data
}

export async function removeCoupon() {
  const { data } = await apiClient.delete<Cart>('/cart/coupon')
  return data
}

export async function acknowledgeCartChanges() {
  const { data } = await apiClient.post<Cart>('/cart/acknowledge')
  return data
}

/**
 * Chaves do carrinho. O dono (visitante ou usuário) faz parte da chave para
 * o cache de um nunca ser exibido para o outro.
 */
export const cartKeys = {
  all: ['cart'] as const,
  detail: (owner: string) => [...cartKeys.all, owner] as const,
}

/** `owner`: id do usuário logado ou "guest" (ver `useOwnerKey`). */
export const cartQueryOptions = (owner: string) =>
  queryOptions({
    queryKey: cartKeys.detail(owner),
    queryFn: ({ signal }) => fetchCart(signal),
    // Preço e estoque mudam: o carrinho é sempre revalidado ao ser exibido.
    staleTime: 0,
  })
