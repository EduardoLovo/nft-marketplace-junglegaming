import { HttpResponse } from 'msw'
import type { NftSummary } from '@/contracts/catalog'
import { db } from '../db'
import { requireUser } from '../domain/auth'
import { apiError, route } from '../http'
import { toSummary } from './nfts'

/**
 * Favoritos por usuário. Adicionar e remover são idempotentes (PUT/DELETE):
 * repetir a mesma operação não muda o resultado, então o cliente pode
 * reenviar com segurança após uma falha de rede.
 */
export const favoriteHandlers = [
  route('get', '/favorites', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const ids = db.state.favorites[auth.user.id] ?? []
    // Mais recentes primeiro; NFTs removidos do catálogo somem da lista.
    const items = [...ids]
      .reverse()
      .map((id) => db.state.nfts.find((nft) => nft.id === id))
      .filter((nft) => nft !== undefined)
      .map(toSummary)
    return HttpResponse.json<NftSummary[]>(items)
  }),

  route<{ nftId: string }>('put', '/favorites/:nftId', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    if (!db.state.nfts.some((nft) => nft.id === params.nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    db.update((state) => {
      const list = (state.favorites[auth.user.id] ??= [])
      if (!list.includes(params.nftId)) list.push(params.nftId)
    })
    return new HttpResponse(null, { status: 204 })
  }),

  route<{ nftId: string }>('delete', '/favorites/:nftId', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    db.update((state) => {
      state.favorites[auth.user.id] = (state.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
