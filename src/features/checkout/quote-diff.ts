import type { Quote } from '@/contracts/checkout'
import { compareEth, formatEth } from '@/lib/eth'

/**
 * Lista legível do que mudou entre a cotação revisada e a nova, para o
 * usuário reconfirmar sabendo exatamente o motivo.
 */
export function describeQuoteChanges(previous: Quote, next: Quote): string[] {
  const changes: string[] = []
  const nextLines = new Map(next.lines.map((line) => [line.editionId, line]))

  for (const line of previous.lines) {
    const updated = nextLines.get(line.editionId)
    if (!updated) {
      changes.push(`${line.name} (${line.editionLabel}) não está mais disponível.`)
      continue
    }
    if (compareEth(line.unitPriceEth, updated.unitPriceEth) !== 0) {
      changes.push(
        `${line.name}: preço de ${formatEth(line.unitPriceEth)} para ${formatEth(updated.unitPriceEth)}.`,
      )
    }
    if (line.quantity !== updated.quantity) {
      changes.push(`${line.name}: quantidade de ${line.quantity} para ${updated.quantity}.`)
    }
  }
  if ((previous.coupon?.code ?? null) !== (next.coupon?.code ?? null)) {
    changes.push(next.coupon ? `Cupom ${next.coupon.code} aplicado.` : 'O cupom deixou de valer.')
  }
  if (compareEth(previous.summary.networkFeeEth, next.summary.networkFeeEth) !== 0) {
    changes.push(
      `Taxa de rede de ${formatEth(previous.summary.networkFeeEth)} para ${formatEth(next.summary.networkFeeEth)}.`,
    )
  }
  if (compareEth(previous.summary.totalEth, next.summary.totalEth) !== 0) {
    changes.push(`Total de ${formatEth(previous.summary.totalEth)} para ${formatEth(next.summary.totalEth)}.`)
  }
  if (changes.length === 0) changes.push('A cotação anterior expirou e foi renovada com os mesmos valores.')
  return changes
}
