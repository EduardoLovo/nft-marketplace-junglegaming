import { HttpResponse } from 'msw'
import type { Wallet } from '@/contracts/wallets'
import { db } from '../db'
import { requireUser } from '../domain/auth'
import type { WalletRecord } from '../fixtures/wallets'
import { apiError, route } from '../http'

export function toPublicWallet(record: WalletRecord): Wallet {
  const { userId: _owner, ...wallet } = record
  return wallet
}

/**
 * Carteira do usuário logado. Uma carteira de outra conta responde 404 (não
 * 403) para não revelar que o id existe.
 */
export function findOwnWallet(userId: string, walletId: string) {
  return db.state.wallets.find((w) => w.id === walletId && w.userId === userId) ?? null
}

function setConnected(userId: string, walletId: string, connected: boolean) {
  db.update((state) => {
    const wallet = state.wallets.find((w) => w.id === walletId && w.userId === userId)
    if (wallet) wallet.connected = connected
  })
}

export const walletHandlers = [
  route('get', '/wallets', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const wallets = db.state.wallets.filter((w) => w.userId === auth.user.id).map(toPublicWallet)
    return HttpResponse.json<Wallet[]>(wallets)
  }),

  /** Conexão simulada: o "aprovar" já aconteceu no popup da carteira, no cliente. */
  route<{ id: string }>('post', '/wallets/:id/connect', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    if (!findOwnWallet(auth.user.id, params.id)) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    setConnected(auth.user.id, params.id, true)
    return HttpResponse.json<Wallet>(toPublicWallet(findOwnWallet(auth.user.id, params.id)!))
  }),

  route<{ id: string }>('post', '/wallets/:id/disconnect', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    if (!findOwnWallet(auth.user.id, params.id)) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    setConnected(auth.user.id, params.id, false)
    return HttpResponse.json<Wallet>(toPublicWallet(findOwnWallet(auth.user.id, params.id)!))
  }),
]
