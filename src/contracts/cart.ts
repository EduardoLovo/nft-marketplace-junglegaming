import type { EthAmount } from '@/lib/eth'
import type { IsoDateTime } from './common'
import type { EditionKind, Network, NftImage } from './catalog'

/**
 * Situação de uma linha frente ao catálogo atual. O servidor só sinaliza;
 * quem corrige (aceitar preço, reduzir ou remover) é o usuário.
 */
export type CartItemStatus =
  /** Preço e estoque iguais aos de quando foi adicionado. */
  | 'ok'
  /** O preço mudou desde que o item entrou no carrinho. */
  | 'price-changed'
  /** Há menos unidades à venda que a quantidade escolhida. */
  | 'insufficient-stock'
  /** A edição esgotou. */
  | 'unavailable'

export interface CartItem {
  /** Igual ao id da edição: cada edição aparece uma única vez no carrinho. */
  editionId: string
  nftId: string
  name: string
  tokenId: string
  image: NftImage
  network: Network
  editionKind: EditionKind
  editionLabel: string
  quantity: number
  /** Preço unitário atual da edição. */
  unitPriceEth: EthAmount
  /** Preço unitário quando o item foi adicionado (ou o último aceito). */
  acceptedUnitPriceEth: EthAmount
  /** `unitPriceEth × quantity`. */
  lineTotalEth: EthAmount
  /** Máximo permitido agora: limite por pedido ou estoque, o que for menor. */
  maxQuantity: number
  status: CartItemStatus
}

export interface AppliedCoupon {
  code: string
  description: string
  /** Falso quando o cupom deixou de valer (ex.: subtotal abaixo do mínimo). */
  valid: boolean
  /** Motivo exibido quando `valid` é falso. */
  reason?: string
}

/** Totais calculados pelo servidor. O cliente nunca recalcula valores. */
export interface CartSummary {
  itemCount: number
  subtotalEth: EthAmount
  discountEth: EthAmount
  /** Estimativa: o valor final vem da cotação no checkout. */
  networkFeeEth: EthAmount
  totalEth: EthAmount
}

export interface Cart {
  id: string
  items: CartItem[]
  coupon: AppliedCoupon | null
  summary: CartSummary
  /** Verdadeiro se alguma linha tem status diferente de `ok`. */
  hasIssues: boolean
  updatedAt: IsoDateTime
}

/** `POST /cart/items` */
export interface AddCartItemInput {
  editionId: string
  quantity: number
}

/** `PATCH /cart/items/:editionId` */
export interface UpdateCartItemInput {
  quantity: number
}

/** `POST /cart/coupon` */
export interface ApplyCouponInput {
  code: string
}

/** Cabeçalho que identifica o carrinho de visitante. */
export const CART_ID_HEADER = 'X-Cart-Id'
