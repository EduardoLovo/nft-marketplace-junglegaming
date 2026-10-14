import type { EthAmount } from '@/lib/eth'

export interface CouponRule {
  description: string
  /** Desconto em pontos-base (1% = 100). */
  percentBps: number
  /** Subtotal mínimo para o cupom valer. */
  minSubtotalEth: EthAmount
  expiresAt: string
}

/**
 * Cupons de demonstração (documentados no README). Cobrem os casos do
 * desafio: válido, válido com valor mínimo e expirado. Qualquer outro código
 * é inválido.
 */
export const COUPONS: Record<string, CouponRule> = {
  KURIO10: {
    description: '10% de desconto no pedido',
    percentBps: 1_000,
    minSubtotalEth: '0',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  GENESIS15: {
    description: '15% de desconto em pedidos a partir de 3 ETH',
    percentBps: 1_500,
    minSubtotalEth: '3',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  VERAO2025: {
    description: '20% de desconto da campanha de verão',
    percentBps: 2_000,
    minSubtotalEth: '0',
    expiresAt: '2025-03-20T23:59:59.000Z',
  },
}

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase()
