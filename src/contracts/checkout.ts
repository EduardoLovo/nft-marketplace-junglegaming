import type { EthAmount } from '@/lib/eth'
import type { CartSummary } from './cart'
import type { EditionKind, NftImage } from './catalog'
import type { IsoDateTime } from './common'
import type { PaymentNetwork, WalletProvider } from './wallets'

/** Linha congelada de uma cotação ou pedido: não muda com o catálogo. */
export interface PurchaseLine {
  editionId: string
  nftId: string
  name: string
  tokenId: string
  image: NftImage
  editionKind: EditionKind
  editionLabel: string
  quantity: number
  unitPriceEth: EthAmount
  lineTotalEth: EthAmount
}

/** `POST /checkout/quote` */
export interface QuoteInput {
  walletId: string
  network: PaymentNetwork
}

/**
 * Cotação: valores oficiais da compra, calculados pelo servidor a partir do
 * carrinho e do catálogo atuais. O pedido só é aceito se a cotação ainda
 * valer e nada tiver mudado desde então.
 */
export interface Quote {
  id: string
  expiresAt: IsoDateTime
  walletId: string
  network: PaymentNetwork
  lines: PurchaseLine[]
  coupon: { code: string; description: string } | null
  summary: CartSummary
}

/** `POST /orders` (com o cabeçalho `Idempotency-Key`). */
export interface CreateOrderInput {
  quoteId: string
  displayName: string
  email: string
  ensName?: string
  referralCode?: string
  note?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface Order {
  id: string
  status: OrderStatus
  /** Incrementa a cada mudança de status (usado nos eventos em tempo real). */
  version: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  lines: PurchaseLine[]
  coupon: Quote['coupon']
  summary: CartSummary
  network: PaymentNetwork
  wallet: { id: string; label: string; provider: WalletProvider; address: string }
  contact: { displayName: string; email: string; ensName: string | null }
  note: string | null
  /** Hash da transação simulada; só existe quando confirmado. */
  txHash: string | null
  rejectionReason: string | null
}

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export const isTerminalStatus = (status: OrderStatus) => status === 'confirmed' || status === 'rejected'
