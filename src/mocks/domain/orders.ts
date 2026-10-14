import type { Order, PurchaseLine, Quote } from '@/contracts/checkout'
import type { CartSummary } from '@/contracts/cart'
import type { PaymentNetwork } from '@/contracts/wallets'
import { addEth, subtractEth, type EthAmount } from '@/lib/eth'
import { getMockConfig } from '../config'
import { db } from '../db'
import type { WalletRecord } from '../fixtures/wallets'
import { randomToken } from './auth'
import { buildCart, findEdition, userCartId } from './cart'

export const QUOTE_TTL_MS = 2 * 60_000

/** Taxa por linha conforme a rede de pagamento escolhida (oficial, ao contrário da estimativa do carrinho). */
const PAYMENT_FEE_ETH: Record<PaymentNetwork, EthAmount> = {
  ethereum: '0.0042',
  polygon: '0.0004',
}

export interface QuoteRecord {
  quote: Quote
  userId: string
}

export interface OrderRecord extends Order {
  userId: string
  /** Quando o pagamento simulado é concluído. */
  settlesAt: string
  outcome: 'approve' | 'decline'
}

export interface IdempotencyRecord {
  userId: string
  fingerprint: string
  orderId: string
}

/**
 * Problema que impede cotar o carrinho, ou `null`. Só falta de estoque
 * bloqueia: uma mudança de preço entra na nova cotação e o usuário a aceita
 * ao reconfirmar a compra.
 */
export function quoteBlocker(userId: string): string | null {
  const record = db.state.carts[userCartId(userId)]
  if (!record || record.lines.length === 0) return 'Seu carrinho está vazio.'
  const cart = buildCart(record, db.state.nfts)
  if (cart.items.some((item) => item.status === 'unavailable' || item.status === 'insufficient-stock')) {
    return 'Há itens esgotados ou com estoque menor que a quantidade escolhida. Revise o carrinho.'
  }
  return null
}

/** Calcula a cotação a partir do carrinho e do catálogo atuais. */
export function computeQuote(userId: string, wallet: WalletRecord, network: PaymentNetwork): Quote {
  const cart = buildCart(db.state.carts[userCartId(userId)], db.state.nfts)
  const lines: PurchaseLine[] = cart.items.map((item) => ({
    editionId: item.editionId,
    nftId: item.nftId,
    name: item.name,
    tokenId: item.tokenId,
    image: item.image,
    editionKind: item.editionKind,
    editionLabel: item.editionLabel,
    quantity: item.quantity,
    unitPriceEth: item.unitPriceEth,
    lineTotalEth: item.lineTotalEth,
  }))
  const networkFee = addEth('0', ...lines.map(() => PAYMENT_FEE_ETH[network]))
  const summary: CartSummary = {
    ...cart.summary,
    networkFeeEth: networkFee,
    totalEth: addEth(subtractEth(cart.summary.subtotalEth, cart.summary.discountEth), networkFee),
  }
  return {
    id: `qt_${randomToken(8)}`,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    walletId: wallet.id,
    network,
    lines,
    coupon: cart.coupon?.valid ? { code: cart.coupon.code, description: cart.coupon.description } : null,
    summary,
  }
}

/** O que importa para comparar duas cotações: itens, preços, cupom e totais. */
export function quoteFingerprint(quote: Pick<Quote, 'lines' | 'coupon' | 'summary' | 'network' | 'walletId'>) {
  return JSON.stringify({
    lines: quote.lines.map((l) => [l.editionId, l.quantity, l.unitPriceEth]),
    coupon: quote.coupon?.code ?? null,
    summary: quote.summary,
    network: quote.network,
    walletId: quote.walletId,
  })
}

/**
 * Conclui pedidos cujo pagamento simulado já terminou. É chamado ao ler
 * pedidos (e pelo timer de tempo real), então o resultado não depende de a
 * aba ter ficado aberta: após um refresh, o pedido chega ao estado certo.
 *
 * Confirmado: baixa o estoque e remove do carrinho só as quantidades compradas.
 * Recusado: nada muda no carrinho nem no estoque.
 */
export function settleDueOrders(now = Date.now()): OrderRecord[] {
  const settled: OrderRecord[] = []
  db.update((state) => {
    for (const order of state.orders) {
      if (order.status !== 'pending' || Date.parse(order.settlesAt) > now) continue

      if (order.outcome === 'decline') {
        order.status = 'rejected'
        order.rejectionReason = 'A carteira recusou a transação.'
      } else {
        const outOfStock = order.lines.find((line) => {
          const edition = findEdition(state.nfts, line.editionId)?.edition
          return !edition || (edition.available !== null && edition.available < line.quantity)
        })
        if (outOfStock) {
          order.status = 'rejected'
          order.rejectionReason = `${outOfStock.name} esgotou antes da confirmação. Nenhum valor foi cobrado.`
        } else {
          for (const line of order.lines) {
            const found = findEdition(state.nfts, line.editionId)
            if (found && found.edition.available !== null) found.edition.available -= line.quantity
            if (found) found.nft.version += 1
          }
          const cart = state.carts[userCartId(order.userId)]
          if (cart) {
            for (const line of order.lines) {
              const cartLine = cart.lines.find((l) => l.editionId === line.editionId)
              if (cartLine) cartLine.quantity -= line.quantity
            }
            cart.lines = cart.lines.filter((l) => l.quantity > 0)
            cart.couponCode = null
          }
          order.status = 'confirmed'
          order.txHash = `0x${randomToken(32)}`
        }
      }
      order.version += 1
      order.updatedAt = new Date(now).toISOString()
      settled.push(order)
    }
  })
  return settled
}

export function nextSettlement() {
  const { paymentDelayMs, paymentOutcome } = getMockConfig()
  return { settlesAt: new Date(Date.now() + paymentDelayMs).toISOString(), outcome: paymentOutcome }
}

export function toPublicOrder(record: OrderRecord): Order {
  const { userId: _user, settlesAt: _settles, outcome: _outcome, ...order } = record
  return order
}
