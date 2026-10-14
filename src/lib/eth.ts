/**
 * Aritmética de valores em ETH sem ponto flutuante.
 *
 * Valores trafegam como strings decimais (ex.: `"1.19"`) e são convertidos
 * para wei (`bigint`, 18 casas) para qualquer conta. Assim `0.1 + 0.2`
 * resulta exatamente em `"0.3"`, o que não acontece com `number`.
 */

/** Valor em ETH como string decimal, ex.: `"1.19"`. Nunca use `number`. */
export type EthAmount = string

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

/** Converte uma string decimal em wei. Lança erro se o formato for inválido. */
export function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) throw new Error(`Valor em ETH inválido: "${value}"`)
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** Converte wei para a forma canônica, sem zeros à direita (ex.: `"1.5"`). */
export function fromWei(wei: bigint): EthAmount {
  if (wei < 0n) throw new Error('Valores em ETH não podem ser negativos')
  const whole = wei / WEI_PER_ETH
  const fraction = (wei % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function addEth(...values: EthAmount[]): EthAmount {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

/** Subtrai sem permitir resultado negativo (ex.: desconto maior que o subtotal). */
export function subtractEth(a: EthAmount, b: EthAmount): EthAmount {
  const result = toWei(a) - toWei(b)
  return fromWei(result > 0n ? result : 0n)
}

export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantidade inválida: ${quantity}`)
  }
  return fromWei(toWei(value) * BigInt(quantity))
}

/**
 * Aplica um percentual expresso em pontos-base (1% = 100 bps), arredondando
 * para baixo no wei. Usado em descontos de cupom e taxas.
 */
export function percentOfEth(value: EthAmount, basisPoints: number): EthAmount {
  return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/**
 * Formata para exibição com no mínimo 2 casas, como no layout (`"1.19 ETH"`).
 * Casas extras significativas são mantidas para não esconder centavos de gas.
 */
export function formatEth(value: EthAmount, { symbol = true } = {}): string {
  const canonical = fromWei(toWei(value))
  const [whole, fraction = ''] = canonical.split('.')
  const formatted = `${whole}.${fraction.padEnd(2, '0')}`
  return symbol ? `${formatted} ETH` : formatted
}
