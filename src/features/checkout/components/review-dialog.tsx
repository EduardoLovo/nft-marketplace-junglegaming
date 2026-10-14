import { Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Quote } from '@/contracts/checkout'
import { PAYMENT_NETWORKS, shortAddress, WALLET_PROVIDERS, type Wallet } from '@/contracts/wallets'
import { PurchaseLines, PurchaseTotals } from './purchase-summary'

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export interface ReviewState {
  quote: Quote
  /** Mudanças desde a cotação anterior: exige reconfirmação explícita. */
  changes: string[] | null
  idempotencyKey: string
}

export function ReviewDialog({
  review,
  wallet,
  contact,
  submitting,
  onConfirm,
  onClose,
}: {
  review: ReviewState | null
  wallet: Wallet | undefined
  contact: { displayName: string; email: string }
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const quote = review?.quote

  return (
    <Dialog
      open={review !== null}
      // Enquanto o pedido é enviado, o diálogo não fecha (evita "sumir" com a compra em andamento).
      onOpenChange={(open) => !open && !submitting && onClose()}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto border border-border bg-surface-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Revise seu pedido</DialogTitle>
          <DialogDescription>
            Confira itens, valores e carteira antes de confirmar.
            {quote && ` Valores garantidos até ${timeFormatter.format(new Date(quote.expiresAt))}.`}
          </DialogDescription>
        </DialogHeader>

        {review?.changes && (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-amber/40 bg-amber/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <TriangleAlertIcon className="size-4 text-amber" aria-hidden="true" />
              Os valores foram atualizados. Confira e confirme novamente.
            </p>
            <ul className="list-disc pl-5 text-text-secondary">
              {review.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </div>
        )}

        {quote && (
          <div className="flex flex-col gap-5">
            <PurchaseLines lines={quote.lines} />
            <PurchaseTotals summary={quote.summary} couponCode={quote.coupon?.code} feeHint={null} />
            <dl className="grid gap-3 rounded-lg bg-surface-raised p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Carteira</dt>
                <dd className="font-medium">
                  {wallet ? `${WALLET_PROVIDERS[wallet.provider]} · ${shortAddress(wallet.address)}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Rede</dt>
                <dd className="font-medium">{PAYMENT_NETWORKS[quote.network]}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Nome de exibição</dt>
                <dd className="font-medium">{contact.displayName}</dd>
              </div>
              <div>
                <dt className="text-text-muted">E-mail do recibo</dt>
                <dd className="truncate font-medium">{contact.email}</dd>
              </div>
            </dl>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar e editar
          </Button>
          <Button onClick={onConfirm} disabled={submitting || !quote} className="font-bold">
            {submitting ? (
              <>
                <Loader2Icon className="animate-spin" aria-hidden="true" />
                Enviando pedido…
              </>
            ) : review?.changes ? (
              'Confirmar com novos valores'
            ) : (
              'Confirmar compra'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
