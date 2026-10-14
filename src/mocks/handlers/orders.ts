import { delay, HttpResponse } from 'msw'
import {
  IDEMPOTENCY_HEADER,
  type CreateOrderInput,
  type Order,
  type Quote,
  type QuoteInput,
} from '@/contracts/checkout'
import { PAYMENT_NETWORKS, type PaymentNetwork } from '@/contracts/wallets'
import { getMockConfig, setMockConfig } from '../config'
import { db } from '../db'
import { randomToken, requireUser } from '../domain/auth'
import {
  computeQuote,
  nextSettlement,
  quoteBlocker,
  quoteFingerprint,
  settleDueOrders,
  toPublicOrder,
  type OrderRecord,
} from '../domain/orders'
import { apiError, route } from '../http'
import { findOwnWallet } from './wallets'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ENS_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) as Partial<T>) ?? {}
  } catch {
    return {}
  }
}

/** Conteúdo que define "o mesmo pedido" para a idempotência. */
const orderFingerprint = (input: Partial<CreateOrderInput>) =>
  JSON.stringify([input.quoteId, input.displayName, input.email, input.ensName ?? '', input.referralCode ?? '', input.note ?? ''])

export const orderHandlers = [
  route('post', '/checkout/quote', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const body = await readJson<QuoteInput>(request)

    const wallet = typeof body.walletId === 'string' ? findOwnWallet(auth.user.id, body.walletId) : null
    if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Selecione uma carteira.', { walletId: 'Selecione uma carteira.' })
    const network = body.network as PaymentNetwork
    if (!(network in PAYMENT_NETWORKS) || !wallet.networks.includes(network)) {
      return apiError(422, 'VALIDATION_ERROR', 'Esta carteira não opera na rede escolhida.', {
        network: 'Esta carteira não opera na rede escolhida.',
      })
    }
    if (!wallet.connected) return apiError(409, 'CONFLICT', 'Conecte a carteira para continuar.', { walletId: 'Conecte a carteira para continuar.' })
    const blocker = quoteBlocker(auth.user.id)
    if (blocker) return apiError(409, 'CONFLICT', blocker)

    const quote = computeQuote(auth.user.id, wallet, network)
    db.update((state) => {
      state.quotes[quote.id] = { quote, userId: auth.user.id }
    })
    return HttpResponse.json<Quote>(quote, { status: 201 })
  }),

  route('post', '/orders', async ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    const key = request.headers.get(IDEMPOTENCY_HEADER)
    if (!key || key.length < 8 || key.length > 128) {
      return apiError(400, 'VALIDATION_ERROR', `Cabeçalho ${IDEMPOTENCY_HEADER} obrigatório.`)
    }
    // Chaves valem por usuário: a de uma conta nunca colide com a de outra.
    const scopedKey = `${auth.user.id}:${key}`
    const body = await readJson<CreateOrderInput>(request)
    const fingerprint = orderFingerprint(body)

    // Mesma chave: mesmo conteúdo devolve o pedido já criado; conteúdo diferente é conflito.
    const previous = db.state.idempotency[scopedKey]
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return apiError(409, 'CONFLICT', 'Esta chave de idempotência já foi usada com outro pedido.')
      }
      const existing = db.state.orders.find((o) => o.id === previous.orderId)
      if (existing) return HttpResponse.json<Order>(toPublicOrder(existing), { status: 200 })
    }

    const fields: Record<string, string> = {}
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const ensName = typeof body.ensName === 'string' && body.ensName.trim() ? body.ensName.trim().toLowerCase() : null
    if (displayName.length < 2) fields.displayName = 'Informe o nome de exibição.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (ensName && !ENS_PATTERN.test(ensName)) fields.ensName = 'Use um nome ENS válido, terminado em .eth.'
    if (Object.keys(fields).length > 0) return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fields)

    const stored = typeof body.quoteId === 'string' ? db.state.quotes[body.quoteId] : undefined
    if (!stored || stored.userId !== auth.user.id) return apiError(404, 'NOT_FOUND', 'Cotação não encontrada.')
    if (Date.parse(stored.quote.expiresAt) <= Date.now()) {
      return apiError(409, 'CONFLICT', 'A cotação expirou. Os valores foram recalculados para você revisar.', { quote: 'expired' })
    }
    const wallet = findOwnWallet(auth.user.id, stored.quote.walletId)
    if (!wallet?.connected) {
      return apiError(409, 'CONFLICT', 'A carteira foi desconectada. Conecte-a novamente.', { walletId: 'disconnected' })
    }
    // Revalida preço, estoque, cupom e taxa: qualquer diferença exige nova confirmação.
    const blocker = quoteBlocker(auth.user.id)
    const fresh = blocker ? null : computeQuote(auth.user.id, wallet, stored.quote.network)
    if (blocker || !fresh || quoteFingerprint(fresh) !== quoteFingerprint(stored.quote)) {
      return apiError(409, 'CONFLICT', blocker ?? 'Preço, estoque ou taxas mudaram desde a revisão. Confira e confirme de novo.', {
        quote: 'stale',
      })
    }

    const now = new Date().toISOString()
    const order: OrderRecord = {
      id: `ord_${randomToken(6)}`,
      userId: auth.user.id,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      lines: stored.quote.lines,
      coupon: stored.quote.coupon,
      summary: stored.quote.summary,
      network: stored.quote.network,
      wallet: { id: wallet.id, label: wallet.label, provider: wallet.provider, address: wallet.address },
      contact: { displayName, email, ensName },
      note: typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null,
      txHash: null,
      rejectionReason: null,
      ...nextSettlement(),
    }
    db.update((state) => {
      state.orders.push(order)
      state.idempotency[scopedKey] = { userId: auth.user.id, fingerprint, orderId: order.id }
      // A cotação vira o pedido: não pode ser reaproveitada com outra chave.
      delete state.quotes[stored.quote.id]
    })

    if (getMockConfig().orderTimeoutOnce) {
      // O pedido já existe, mas a resposta nunca chega: o cliente estoura o
      // timeout e deve repetir com a mesma chave para recuperar este pedido.
      setMockConfig({ orderTimeoutOnce: false })
      await delay('infinite')
    }
    return HttpResponse.json<Order>(toPublicOrder(order), { status: 201 })
  }),

  route('get', '/orders', ({ request }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    settleDueOrders()
    const orders = db.state.orders
      .filter((o) => o.userId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublicOrder)
    return HttpResponse.json<Order[]>(orders)
  }),

  route<{ id: string }>('get', '/orders/:id', ({ request, params }) => {
    const auth = requireUser(request)
    if (auth instanceof Response) return auth
    settleDueOrders()
    const order = db.state.orders.find((o) => o.id === params.id)
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
    return HttpResponse.json<Order>(toPublicOrder(order))
  }),
]
