import type { CartSummary } from '@/contracts/cart'
import type { PurchaseLine } from '@/contracts/checkout'
import { compareEth, formatEth } from '@/lib/eth'

/** Itens de uma cotação ou pedido ("Seus NFTs" / "Detalhes da transação"). */
export function PurchaseLines({ lines }: { lines: PurchaseLine[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {lines.map((line) => (
        <li key={line.editionId} className="flex items-center gap-3 py-3">
          <img
            src={line.image.src}
            srcSet={line.image.srcSet}
            sizes="56px"
            width={56}
            height={56}
            alt=""
            loading="lazy"
            className="size-14 shrink-0 rounded-[6px] object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-base leading-4 font-bold">{line.name}</p>
            <p className="text-sm leading-4 text-text-muted">
              Edição {line.editionLabel} · ID do token: {line.tokenId}
            </p>
          </div>
          <p className="shrink-0 text-sm text-text-secondary">(x {line.quantity})</p>
          <p className="w-24 shrink-0 text-right text-lg leading-4 font-bold">{formatEth(line.lineTotalEth)}</p>
        </li>
      ))}
    </ul>
  )
}

export function PurchaseTotals({
  summary,
  couponCode,
  feeHint = 'Taxa estimada',
}: {
  summary: CartSummary
  couponCode?: string | null
  feeHint?: string | null
}) {
  const hasDiscount = compareEth(summary.discountEth, '0') > 0
  return (
    <dl className="flex flex-col gap-3 text-[15px]">
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-lg leading-5">{formatEth(summary.subtotalEth)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>{hasDiscount && couponCode ? `Desconto (${couponCode})` : 'Desconto do lançamento'}</dt>
        <dd className={hasDiscount ? 'text-success' : undefined}>(-) {formatEth(summary.discountEth)}</dd>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex w-full justify-between gap-4">
          <dt>Taxa de rede</dt>
          <dd className="text-lg leading-5">{formatEth(summary.networkFeeEth)}</dd>
        </div>
        {feeHint && <p className="text-xs text-primary">{feeHint}</p>}
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-3">
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-lg leading-4 font-bold text-primary">{formatEth(summary.totalEth)}</dd>
      </div>
    </dl>
  )
}
