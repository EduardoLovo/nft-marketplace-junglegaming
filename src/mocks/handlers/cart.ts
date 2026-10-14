import { HttpResponse } from 'msw'
import {
  CART_ID_HEADER,
  type AddCartItemInput,
  type ApplyCouponInput,
  type Cart,
  type UpdateCartItemInput,
} from '@/contracts/cart'
import { db } from '../db'
import { authenticate } from '../domain/auth'
import {
  buildCart,
  couponProblem,
  emptyCart,
  findEdition,
  maxQuantityFor,
  userCartId,
  type CartRecord,
} from '../domain/cart'
import { COUPONS, normalizeCouponCode } from '../fixtures/coupons'
import { apiError, route } from '../http'

const CART_ID_PATTERN = /^[a-zA-Z0-9:-]{8,64}$/

/**
 * Carrinho da requisição: o da conta, se houver sessão válida; senão o de
 * visitante indicado em `X-Cart-Id`. Sessão expirada vira 401, nunca o
 * carrinho de visitante, para o cliente saber que precisa entrar de novo.
 */
function resolveCartId(request: Request): string | Response {
  const auth = authenticate(request)
  if (auth.kind === 'rejected') return auth.response
  if (auth.kind === 'authenticated') return userCartId(auth.user.id)
  const id = request.headers.get(CART_ID_HEADER)
  if (id && CART_ID_PATTERN.test(id)) return id
  return apiError(400, 'VALIDATION_ERROR', `Cabeçalho ${CART_ID_HEADER} ausente ou inválido.`)
}

function cartResponse(cartId: string, status = 200) {
  const record = db.state.carts[cartId] ?? emptyCart(cartId)
  return HttpResponse.json<Cart>(buildCart(record, db.state.nfts), { status })
}

/** Aplica uma alteração no carrinho (criando-o se preciso) e persiste. */
function mutateCart(cartId: string, mutate: (cart: CartRecord) => void) {
  db.update((state) => {
    const cart = state.carts[cartId] ?? emptyCart(cartId)
    mutate(cart)
    cart.updatedAt = new Date().toISOString()
    state.carts[cartId] = cart
  })
}

async function readJson<T>(request: Request): Promise<Partial<T> | null> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return null
  }
}

const isQuantity = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1

export const cartHandlers = [
  route('get', '/cart', ({ request }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    return cartResponse(cartId)
  }),

  route('post', '/cart/items', async ({ request }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    const body = await readJson<AddCartItemInput>(request)
    if (!body || typeof body.editionId !== 'string' || !isQuantity(body.quantity)) {
      return apiError(422, 'VALIDATION_ERROR', 'Dados inválidos.', { quantity: 'Informe uma quantidade inteira.' })
    }

    const found = findEdition(db.state.nfts, body.editionId)
    if (!found) return apiError(404, 'NOT_FOUND', 'Edição não encontrada.')
    const max = maxQuantityFor(found.edition)
    if (max === 0) return apiError(409, 'CONFLICT', 'Esta edição esgotou.')

    const current = db.state.carts[cartId]?.lines.find((l) => l.editionId === body.editionId)?.quantity ?? 0
    const quantity = body.quantity
    if (current + quantity > max) {
      return apiError(
        409,
        'CONFLICT',
        current > 0
          ? `Você já tem ${current} no carrinho. O limite para esta edição é ${max}.`
          : `O limite para esta edição é ${max}.`,
      )
    }

    mutateCart(cartId, (cart) => {
      const line = cart.lines.find((l) => l.editionId === body.editionId)
      if (line) {
        line.quantity += quantity
      } else {
        cart.lines.push({
          editionId: found.edition.id,
          quantity,
          acceptedUnitPriceEth: found.edition.priceEth,
        })
      }
    })
    return cartResponse(cartId, 201)
  }),

  route<{ editionId: string }>('patch', '/cart/items/:editionId', async ({ request, params }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    const body = await readJson<UpdateCartItemInput>(request)
    if (!body || !isQuantity(body.quantity)) {
      return apiError(422, 'VALIDATION_ERROR', 'Dados inválidos.', { quantity: 'Informe uma quantidade inteira.' })
    }
    const line = db.state.carts[cartId]?.lines.find((l) => l.editionId === params.editionId)
    if (!line) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')

    const found = findEdition(db.state.nfts, params.editionId)
    const max = found ? maxQuantityFor(found.edition) : 0
    if (body.quantity > max) {
      return apiError(
        409,
        'CONFLICT',
        max === 0 ? 'Esta edição esgotou.' : `Só há ${max} disponíveis para esta edição.`,
      )
    }

    const quantity = body.quantity
    mutateCart(cartId, (cart) => {
      const target = cart.lines.find((l) => l.editionId === params.editionId)
      if (target) target.quantity = quantity
    })
    return cartResponse(cartId)
  }),

  route<{ editionId: string }>('delete', '/cart/items/:editionId', ({ request, params }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    // Remover algo que já não está no carrinho não é erro: a operação é idempotente.
    mutateCart(cartId, (cart) => {
      cart.lines = cart.lines.filter((l) => l.editionId !== params.editionId)
    })
    return cartResponse(cartId)
  }),

  route('post', '/cart/coupon', async ({ request }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    const body = await readJson<ApplyCouponInput>(request)
    const code = typeof body?.code === 'string' ? normalizeCouponCode(body.code) : ''
    if (!code) return apiError(422, 'VALIDATION_ERROR', 'Informe um cupom.', { code: 'Informe um cupom.' })

    const rule = COUPONS[code]
    if (!rule) return apiError(422, 'VALIDATION_ERROR', 'Cupom inválido.', { code: 'Cupom inválido.' })
    const record = db.state.carts[cartId] ?? emptyCart(cartId)
    const problem = couponProblem(rule, buildCart(record, db.state.nfts).summary.subtotalEth)
    if (problem) return apiError(422, 'VALIDATION_ERROR', problem, { code: problem })

    mutateCart(cartId, (cart) => {
      cart.couponCode = code
    })
    return cartResponse(cartId)
  }),

  route('delete', '/cart/coupon', ({ request }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    mutateCart(cartId, (cart) => {
      cart.couponCode = null
    })
    return cartResponse(cartId)
  }),

  /** Aceita os preços atuais: as linhas deixam de aparecer como "preço alterado". */
  route('post', '/cart/acknowledge', ({ request }) => {
    const cartId = resolveCartId(request)
    if (cartId instanceof Response) return cartId
    mutateCart(cartId, (cart) => {
      for (const line of cart.lines) {
        const found = findEdition(db.state.nfts, line.editionId)
        if (found) line.acceptedUnitPriceEth = found.edition.priceEth
      }
    })
    return cartResponse(cartId)
  }),
]
