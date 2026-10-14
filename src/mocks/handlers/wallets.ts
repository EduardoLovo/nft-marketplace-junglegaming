import { HttpResponse } from 'msw'
import { ENS_PATTERN } from '@/contracts/auth'
import {
  PAYMENT_NETWORKS,
  WALLET_ADDRESS_PATTERN,
  WALLET_PROVIDERS,
  type CreateWalletInput,
  type PaymentNetwork,
  type UpdateWalletInput,
  type Wallet,
} from '@/contracts/wallets'
import { db } from '../db'
import { randomToken, requireUser } from '../domain/auth'
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

const listFor = (userId: string) =>
  db.state.wallets
    .filter((w) => w.userId === userId)
    // Principal primeiro, depois na ordem de cadastro.
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .map(toPublicWallet)

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) as Partial<T>) ?? {}
  } catch {
    return {}
  }
}

/** Valida os campos editáveis; devolve os erros por campo. */
function validateWalletFields(body: Partial<CreateWalletInput>, partial: boolean) {
  const fields: Record<string, string> = {}
  if (!partial || body.label !== undefined) {
    const label = typeof body.label === 'string' ? body.label.trim() : ''
    if (label.length < 2 || label.length > 24) fields.label = 'Use de 2 a 24 caracteres.'
  }
  if (!partial || body.networks !== undefined) {
    const networks = Array.isArray(body.networks) ? body.networks : []
    if (networks.length === 0 || networks.some((n) => !(n in PAYMENT_NETWORKS))) {
      fields.networks = 'Selecione ao menos uma rede.'
    }
  }
  if (body.ensName && !ENS_PATTERN.test(String(body.ensName).trim().toLowerCase())) {
    fields.ensName = 'Use um nome ENS válido, terminado em .eth.'
  }
  return fields
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
    return HttpResponse.json<Wallet[]>(listFor(auth.user.id))
  }),

  route('post', '/wallets', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const body = await readJson<CreateWalletInput>(request)

    const fields = validateWalletFields(body, false)
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    if (!WALLET_ADDRESS_PATTERN.test(address)) fields.address = 'Informe um endereço 0x com 40 caracteres hexadecimais.'
    if (typeof body.provider !== 'string' || !(body.provider in WALLET_PROVIDERS)) {
      fields.provider = 'Selecione o tipo de carteira.'
    }
    if (Object.keys(fields).length > 0) return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)

    const own = db.state.wallets.filter((w) => w.userId === auth.user.id)
    if (own.some((w) => w.address.toLowerCase() === address.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Esta carteira já está cadastrada.', { address: 'Esta carteira já está cadastrada.' })
    }

    // A primeira carteira da conta é sempre a principal.
    const isDefault = own.length === 0 || body.isDefault === true
    const wallet: WalletRecord = {
      id: `wal_${randomToken(6)}`,
      userId: auth.user.id,
      label: body.label!.trim(),
      provider: body.provider!,
      address,
      ensName: body.ensName ? body.ensName.trim().toLowerCase() : null,
      networks: Array.from(new Set(body.networks as PaymentNetwork[])),
      isDefault,
      connected: false,
    }
    db.update((state) => {
      if (isDefault) for (const w of state.wallets) if (w.userId === auth.user.id) w.isDefault = false
      state.wallets.push(wallet)
    })
    return HttpResponse.json<Wallet>(toPublicWallet(wallet), { status: 201 })
  }),

  route<{ id: string }>('patch', '/wallets/:id', async ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    if (!findOwnWallet(auth.user.id, params.id)) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const body = await readJson<UpdateWalletInput>(request)
    const fields = validateWalletFields(body, true)
    if (Object.keys(fields).length > 0) return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)
    if (body.isDefault === false && findOwnWallet(auth.user.id, params.id)!.isDefault) {
      return apiError(409, 'CONFLICT', 'Defina outra carteira como principal antes.', {
        isDefault: 'Defina outra carteira como principal antes.',
      })
    }

    db.update((state) => {
      const wallet = state.wallets.find((w) => w.id === params.id)!
      if (body.label !== undefined) wallet.label = body.label.trim()
      if (body.ensName !== undefined) wallet.ensName = body.ensName ? body.ensName.trim().toLowerCase() : null
      if (body.networks !== undefined) wallet.networks = Array.from(new Set(body.networks))
      if (body.isDefault) {
        for (const w of state.wallets) if (w.userId === auth.user.id) w.isDefault = w.id === wallet.id
      }
    })
    return HttpResponse.json<Wallet>(toPublicWallet(findOwnWallet(auth.user.id, params.id)!))
  }),

  route<{ id: string }>('delete', '/wallets/:id', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const wallet = findOwnWallet(auth.user.id, params.id)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const hasPendingOrder = db.state.orders.some((o) => o.wallet.id === wallet.id && o.status === 'pending')
    if (hasPendingOrder) {
      return apiError(409, 'CONFLICT', 'Esta carteira tem um pedido em processamento. Aguarde a conclusão para removê-la.')
    }

    db.update((state) => {
      state.wallets = state.wallets.filter((w) => w.id !== wallet.id)
      // Removendo a principal, a próxima carteira da conta assume.
      if (wallet.isDefault) {
        const next = state.wallets.find((w) => w.userId === auth.user.id)
        if (next) next.isDefault = true
      }
    })
    return new HttpResponse(null, { status: 204 })
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
