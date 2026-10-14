import type { NftEdition, Network } from '@/contracts/catalog'
import type { Cart, CartItem, CartItemStatus } from '@/contracts/cart'
import { addEth, compareEth, formatEth, multiplyEth, percentOfEth, subtractEth, type EthAmount } from '@/lib/eth'
import { COUPONS, type CouponRule } from '../fixtures/coupons'
import type { NftRecord } from '../fixtures/nfts'

/** Linha persistida: só referências e o preço aceito; o resto vem do catálogo atual. */
export interface CartLineRecord {
  editionId: string
  quantity: number
  acceptedUnitPriceEth: EthAmount
}

export interface CartRecord {
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  updatedAt: string
}

/** Taxa estimada por linha, conforme a rede do NFT. */
export const NETWORK_FEE_ETH: Record<Network, EthAmount> = {
  ethereum: '0.0042',
  polygon: '0.0004',
  solana: '0.0002',
}

export function emptyCart(id: string): CartRecord {
  return { id, lines: [], couponCode: null, updatedAt: new Date().toISOString() }
}

export function findEdition(nfts: NftRecord[], editionId: string): { nft: NftRecord; edition: NftEdition } | null {
  for (const nft of nfts) {
    const edition = nft.editions.find((e) => e.id === editionId)
    if (edition) return { nft, edition }
  }
  return null
}

export function maxQuantityFor(edition: NftEdition) {
  if (edition.available === 0) return 0
  return edition.available === null ? edition.maxPerOrder : Math.min(edition.maxPerOrder, edition.available)
}

function statusFor(line: CartLineRecord, edition: NftEdition): CartItemStatus {
  const max = maxQuantityFor(edition)
  if (max === 0) return 'unavailable'
  if (line.quantity > max) return 'insufficient-stock'
  if (compareEth(line.acceptedUnitPriceEth, edition.priceEth) !== 0) return 'price-changed'
  return 'ok'
}

/** Motivo de um cupom não valer para o subtotal informado, ou `null` se vale. */
export function couponProblem(rule: CouponRule, subtotal: EthAmount, now = Date.now()): string | null {
  if (Date.parse(rule.expiresAt) < now) return 'Este cupom expirou.'
  if (compareEth(subtotal, rule.minSubtotalEth) < 0) {
    return `Válido para pedidos a partir de ${formatEth(rule.minSubtotalEth)}.`
  }
  return null
}

/**
 * Monta o carrinho público a partir do registro e do catálogo atual. Linhas
 * esgotadas ficam visíveis (para o usuário remover), mas não entram nos totais.
 */
export function buildCart(record: CartRecord, nfts: NftRecord[]): Cart {
  const items: CartItem[] = []
  for (const line of record.lines) {
    const found = findEdition(nfts, line.editionId)
    if (!found) continue // Edição removida do catálogo: some do carrinho.
    const { nft, edition } = found
    items.push({
      editionId: edition.id,
      nftId: nft.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      network: nft.network,
      editionKind: edition.kind,
      editionLabel: edition.label,
      quantity: line.quantity,
      unitPriceEth: edition.priceEth,
      acceptedUnitPriceEth: line.acceptedUnitPriceEth,
      lineTotalEth: multiplyEth(edition.priceEth, line.quantity),
      maxQuantity: maxQuantityFor(edition),
      status: statusFor(line, edition),
    })
  }

  const billable = items.filter((item) => item.status !== 'unavailable')
  const subtotal = addEth('0', ...billable.map((item) => item.lineTotalEth))
  const networkFee = addEth('0', ...billable.map((item) => NETWORK_FEE_ETH[item.network]))

  let coupon: Cart['coupon'] = null
  let discount: EthAmount = '0'
  if (record.couponCode) {
    const rule = COUPONS[record.couponCode]
    const problem = rule ? couponProblem(rule, subtotal) : 'Cupom inválido.'
    coupon = {
      code: record.couponCode,
      description: rule?.description ?? '',
      valid: problem === null,
      reason: problem ?? undefined,
    }
    if (rule && !problem) discount = percentOfEth(subtotal, rule.percentBps)
  }

  return {
    id: record.id,
    items,
    coupon,
    summary: {
      itemCount: billable.reduce((sum, item) => sum + item.quantity, 0),
      subtotalEth: subtotal,
      discountEth: discount,
      networkFeeEth: networkFee,
      totalEth: addEth(subtractEth(subtotal, discount), networkFee),
    },
    hasIssues: items.some((item) => item.status !== 'ok'),
    updatedAt: record.updatedAt,
  }
}
