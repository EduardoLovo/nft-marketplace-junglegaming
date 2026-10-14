import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ClockIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/contracts/checkout'
import { useSession } from '@/features/auth/use-session'
import { useCart } from '@/features/cart/hooks'
import { useCreateOrder, useCreateQuote, useOrders } from '@/features/checkout/api'
import { PurchaseLines, PurchaseTotals } from '@/features/checkout/components/purchase-summary'
import { ReviewDialog, type ReviewState } from '@/features/checkout/components/review-dialog'
import { WalletPanel, type WalletSelection } from '@/features/checkout/components/wallet-panel'
import { describeQuoteChanges } from '@/features/checkout/quote-diff'
import { useWallets, walletKeys } from '@/features/wallets/api'
import { isApiError } from '@/lib/api/errors'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(''))

const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Use no máximo 40 caracteres.'),
  email: z.string().trim().min(1, 'Informe o e-mail para o recibo.').email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^([a-z0-9-]+(\.[a-z0-9-]+)*\.eth)?$/i, 'Use um nome ENS válido, terminado em .eth.')
    .optional(),
  referralCode: optionalText(20, 'Use no máximo 20 caracteres.'),
  note: optionalText(500, 'Use no máximo 500 caracteres.'),
})

type CheckoutValues = z.infer<typeof checkoutSchema>

const newIdempotencyKey = () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const session = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: cart, isPending: cartPending } = useCart()
  const { data: wallets } = useWallets()
  const { data: orders } = useOrders()
  const createQuote = useCreateQuote()
  const createOrder = useCreateOrder()

  const [selection, setSelection] = useState<WalletSelection>({ walletId: null, network: null })
  const [walletError, setWalletError] = useState<string>()
  const [review, setReview] = useState<ReviewState | null>(null)

  // Carteira padrão pré-selecionada quando a lista chega.
  const defaultWallet = wallets?.find((wallet) => wallet.isDefault) ?? wallets?.[0]
  const effectiveSelection: WalletSelection =
    selection.walletId === null && defaultWallet
      ? { walletId: defaultWallet.id, network: defaultWallet.networks[0] }
      : selection
  const selectedWallet = wallets?.find((wallet) => wallet.id === effectiveSelection.walletId)

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    values: {
      displayName: session?.user.name ?? '',
      email: session?.user.email ?? '',
      ensName: '',
      referralCode: '',
      note: '',
    },
    resetOptions: { keepDirtyValues: true },
  })
  const { errors } = form.formState
  const pendingOrder = orders?.find((order) => order.status === 'pending')

  async function requestQuote(): Promise<Quote | null> {
    if (!effectiveSelection.walletId || !effectiveSelection.network) {
      setWalletError('Selecione uma carteira e a rede de pagamento.')
      return null
    }
    if (!selectedWallet?.connected) {
      setWalletError('Conecte a carteira para revisar o pedido.')
      return null
    }
    setWalletError(undefined)
    try {
      return await createQuote.mutateAsync({ walletId: effectiveSelection.walletId, network: effectiveSelection.network })
    } catch (error) {
      toast.error('Não foi possível calcular o pedido', {
        description: isApiError(error) ? error.message : 'Tente novamente em instantes.',
      })
      return null
    }
  }

  const openReview = form.handleSubmit(async () => {
    const quote = await requestQuote()
    // Cada cotação tem sua própria chave: reenviar a mesma confirmação nunca duplica o pedido.
    if (quote) setReview({ quote, changes: null, idempotencyKey: newIdempotencyKey() })
  })

  function confirm() {
    if (!review) return
    const values = form.getValues()
    createOrder.mutate(
      {
        input: {
          quoteId: review.quote.id,
          displayName: values.displayName,
          email: values.email,
          ensName: values.ensName || undefined,
          referralCode: values.referralCode || undefined,
          note: values.note || undefined,
        },
        idempotencyKey: review.idempotencyKey,
      },
      {
        onSuccess: (order) => {
          setReview(null)
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
        },
        onError: async (error) => {
          if (!isApiError(error)) return
          // Cotação vencida ou valores alterados: recalcula e pede nova confirmação.
          if (error.code === 'CONFLICT' && error.fields.quote) {
            const previous = review.quote
            const quote = await requestQuote()
            if (quote) {
              setReview({ quote, changes: describeQuoteChanges(previous, quote), idempotencyKey: newIdempotencyKey() })
            } else {
              setReview(null)
            }
            return
          }
          if (error.code === 'CONFLICT' && error.fields.walletId) {
            setReview(null)
            setWalletError(error.message)
            void queryClient.invalidateQueries({ queryKey: walletKeys.all })
            return
          }
          if (error.code === 'VALIDATION_ERROR') {
            setReview(null)
            for (const [field, message] of Object.entries(error.fields)) {
              if (field in checkoutSchema.shape) form.setError(field as keyof CheckoutValues, { message })
            }
            return
          }
          toast.error('Não foi possível criar o pedido', { description: error.message })
        },
      },
    )
  }

  if (cartPending) {
    return (
      <div aria-busy="true" aria-label="Carregando pagamento" className="flex flex-col gap-6 pt-8 lg:flex-row">
        <Skeleton className="h-[600px] flex-1" />
        <Skeleton className="h-[600px] w-full lg:w-[405px]" />
      </div>
    )
  }

  // Só falta de estoque impede seguir; preço alterado aparece na revisão para reconfirmar.
  const stockProblem = cart?.items.some((item) => item.status === 'unavailable' || item.status === 'insufficient-stock')
  const cartBlocked = !cart || cart.summary.itemCount === 0 || stockProblem

  return (
    <div className="flex flex-col gap-8 pt-2 lg:pt-8">
      <nav aria-label="Trilha de navegação" className="hidden text-[15px] leading-4 font-bold lg:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/" className="rounded-sm hover:text-kurio-accent">
              Início
            </Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li>
            <Link to="/" hash="mercado" className="rounded-sm hover:text-kurio-accent">
              Mercado
            </Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="text-xl font-bold lg:sr-only">Pagamento com carteira</h1>

      {pendingOrder && (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ClockIcon className="size-4 text-amber" aria-hidden="true" />
            Você tem um pedido em processamento. Acompanhe-o antes de comprar de novo.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }}>
              Ver pedido
            </Link>
          </Button>
        </div>
      )}

      {cartBlocked ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-card p-6">
          <h2 className="text-lg font-bold">
            {cart && cart.summary.itemCount > 0 ? 'Revise seu carrinho antes de pagar' : 'Seu carrinho está vazio'}
          </h2>
          <p className="text-sm text-text-secondary">
            {cart && cart.summary.itemCount > 0
              ? 'Há itens esgotados ou com estoque menor que a quantidade escolhida.'
              : 'Adicione NFTs ao carrinho para finalizar uma compra.'}
          </p>
          <Button asChild>
            <Link to={cart && cart.summary.itemCount > 0 ? '/cart' : '/'}>
              {cart && cart.summary.itemCount > 0 ? 'Ir para o carrinho' : 'Explorar NFTs'}
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={openReview} noValidate className="flex flex-col gap-8 lg:flex-row lg:gap-8">
          <section aria-labelledby="buyer-title" className="flex flex-1 flex-col gap-6 lg:max-w-[763px]">
            <h2 id="buyer-title" className="text-[17px] font-bold">
              Perfil do colecionador
            </h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <TextField label="Nome de exibição *" autoComplete="nickname" error={errors.displayName?.message} {...form.register('displayName')} />
              <TextField label="E-mail para o recibo *" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
              <TextField
                label="Nome ENS (opcional)"
                placeholder="seunome.eth"
                hint="ENS ou carteira secundária para exibir no recibo."
                error={errors.ensName?.message}
                {...form.register('ensName')}
              />
              <TextField label="Código de indicação (opcional)" error={errors.referralCode?.message} {...form.register('referralCode')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-note" className="text-sm font-medium">
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="checkout-note"
                rows={4}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={errors.note ? 'checkout-note-error' : undefined}
                className="rounded-[5px] border border-border bg-transparent p-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                {...form.register('note')}
              />
              {errors.note && (
                <p id="checkout-note-error" className="text-xs text-coral">
                  {errors.note.message}
                </p>
              )}
            </div>

            <section aria-labelledby="wallet-title" className="flex flex-col gap-4">
              <h2 id="wallet-title" className="text-[17px] font-bold">
                Carteira e rede
              </h2>
              <p className="w-fit rounded-[6px] border border-border-strong bg-surface-dark px-2 py-1.5 text-[9px] font-bold tracking-wide text-kurio-accent">
                METAMASK • WALLETCONNECT • COINBASE
              </p>
              <WalletPanel
                value={effectiveSelection}
                onChange={(next) => {
                  setSelection(next)
                  setWalletError(undefined)
                }}
                error={walletError}
              />
            </section>
          </section>

          <aside aria-labelledby="your-nfts-title" className="flex w-full flex-col gap-5 lg:w-[405px]">
            <h2 id="your-nfts-title" className="border-b-[0.3px] border-primary pb-3 text-[17px] font-bold">
              Seus NFTs
            </h2>
            <PurchaseLines
              lines={cart.items.map((item) => ({
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
              }))}
            />
            <Link to="/cart" className="text-center text-sm text-text-secondary hover:text-primary">
              Tem um código promocional? <span className="text-primary underline">Aplique aqui</span>
            </Link>
            <PurchaseTotals summary={cart.summary} couponCode={cart.coupon?.valid ? cart.coupon.code : null} feeHint="Taxa estimada · o valor final aparece na revisão" />
            <Button type="submit" disabled={createQuote.isPending} className="h-10 w-full rounded-[3px] text-[15px] font-bold">
              {createQuote.isPending ? 'Calculando…' : 'Revisar pedido'}
            </Button>
          </aside>
        </form>
      )}

      <ReviewDialog
        review={review}
        wallet={selectedWallet}
        contact={{ displayName: form.getValues('displayName'), email: form.getValues('email') }}
        submitting={createOrder.isPending}
        onConfirm={confirm}
        onClose={() => setReview(null)}
      />
    </div>
  )
}
