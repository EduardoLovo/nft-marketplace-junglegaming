import type { CartSummary } from '@/contracts/cart'
import type { PurchaseLine } from '@/contracts/checkout'
import { compareEth, formatEth } from '@/lib/eth'

/**
 * Itens de uma cotação ou pedido ("Seus NFTs" do Figma): linhas de 70px com a
 * arte de raio 8, nome, ID do token, quantidade e subtotal da linha.
 */
export function PurchaseLines({ lines, withHeader = false }: { lines: PurchaseLine[]; withHeader?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {withHeader && (
        <div aria-hidden="true" className="flex justify-between border-b-[0.3px] border-primary pb-[11px] text-base leading-4">
          <span className="font-bold">NFTs</span>
          <span className="font-medium">Subtotal</span>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.editionId} className="flex min-h-[70px] items-center gap-[7px] bg-surface-card pr-[15px] pl-[3px]">
            <img
              src={line.image.src}
              srcSet={line.image.srcSet}
              sizes="70px"
              width={70}
              height={70}
              alt=""
              loading="lazy"
              className="size-[70px] shrink-0 rounded-lg object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="truncate text-base leading-4 font-bold">{line.name}</p>
              <p className="text-sm leading-4 text-kurio-secondary">
                ID do token: {line.tokenId}
                <span className="sr-only">, edição {line.editionLabel}</span>
              </p>
            </div>
            <p className="shrink-0 text-sm leading-4 text-text-secondary">(x {line.quantity})</p>
            <p className="min-w-[87px] shrink-0 text-right text-lg leading-4 font-bold text-kurio-accent">
              {formatEth(line.lineTotalEth)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Subtotal, desconto, taxa e total. Como no Figma: "Taxa estimada" centralizada,
 * divisória cobre e a linha do total centralizada (321px).
 */
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
    <dl className="flex flex-col gap-3 text-[15px] leading-5">
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-lg leading-5">{formatEth(summary.subtotalEth)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>{hasDiscount && couponCode ? `Desconto (${couponCode})` : 'Desconto do lançamento'}</dt>
        <dd className={hasDiscount ? 'text-success' : undefined}>(-) {formatEth(summary.discountEth)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Taxa de rede</dt>
        <dd className="text-lg leading-5">{formatEth(summary.networkFeeEth)}</dd>
      </div>
      {feeHint && <p className="text-center text-xs leading-4 text-kurio-accent">{feeHint}</p>}
      <div className="flex justify-center border-t-[0.3px] border-primary pt-3">
        <div className="flex w-full max-w-[321px] justify-between gap-4">
          <dt className="text-base leading-4 font-bold">Total</dt>
          <dd className="text-lg leading-4 font-bold text-kurio-accent">{formatEth(summary.totalEth)}</dd>
        </div>
      </div>
    </dl>
  )
}
