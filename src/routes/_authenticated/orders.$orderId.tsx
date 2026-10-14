import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { CircleCheckBigIcon, CircleXIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/contracts/checkout'
import { PAYMENT_NETWORKS, shortAddress, WALLET_PROVIDERS } from '@/contracts/wallets'
import { useOwnerKey } from '@/features/auth/use-session'
import { orderQueryOptions, refreshAfterSettlement } from '@/features/checkout/api'
import { PurchaseLines } from '@/features/checkout/components/purchase-summary'
import { isApiError } from '@/lib/api/errors'
import { sessionStore } from '@/lib/auth/session-store'
import { formatEth } from '@/lib/eth'
import { notAvailable } from '@/lib/not-available'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  // Acesso direto ou refresh recuperam o pedido (inclusive pendente) do servidor.
  loader: async ({ context, params }) => {
    const owner = sessionStore.get()?.user.id ?? 'guest'
    try {
      await context.queryClient.ensureQueryData(orderQueryOptions(owner, params.orderId))
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  pendingMs: 150,
  pendingComponent: OrderSkeleton,
  notFoundComponent: () => (
    <OrderMessage title="Pedido não encontrado" text="Confira o endereço ou veja seus pedidos no perfil." />
  ),
  errorComponent: OrderError,
  component: OrderPage,
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

const STATUS_COPY: Record<Order['status'], { title: string; announce: string }> = {
  pending: { title: 'Processando seu pagamento', announce: 'Pedido em processamento.' },
  confirmed: { title: 'Seus NFTs agora estão na sua carteira', announce: 'Pagamento confirmado.' },
  rejected: { title: 'Pagamento recusado', announce: 'Pagamento recusado.' },
}

function OrderPage() {
  const { orderId } = Route.useParams()
  const owner = useOwnerKey()
  const queryClient = useQueryClient()
  const { data: order } = useSuspenseQuery(orderQueryOptions(owner, orderId))
  const previousStatus = useRef(order.status)
  useDocumentTitle(order.status === 'confirmed' ? 'Pedido confirmado' : order.status === 'rejected' ? 'Pagamento recusado' : 'Processando pedido')

  // Ao sair de "pendente", carrinho (itens comprados saem) e estoque mudaram.
  useEffect(() => {
    if (previousStatus.current === 'pending' && order.status !== 'pending') refreshAfterSettlement(queryClient)
    previousStatus.current = order.status
  }, [order.status, queryClient])

  const copy = STATUS_COPY[order.status]
  const networkName = PAYMENT_NETWORKS[order.network]

  return (
    <div className="flex justify-center pt-4 lg:pt-12">
      <article aria-labelledby="order-title" className="w-full max-w-[578px] overflow-hidden rounded-lg bg-surface-card">
        <p className="sr-only" aria-live="polite">
          {copy.announce}
        </p>
        <header className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          {order.status === 'pending' && <Loader2Icon className="size-16 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />}
          {order.status === 'confirmed' && <CircleCheckBigIcon className="size-16 text-success" aria-hidden="true" />}
          {order.status === 'rejected' && <CircleXIcon className="size-16 text-coral" aria-hidden="true" />}
          <h1 id="order-title" className="text-base font-bold text-text-secondary">
            {copy.title}
          </h1>
          {order.status === 'pending' && (
            <p className="max-w-sm text-sm text-text-muted">
              Aguardando a confirmação da carteira na rede {networkName}. Você pode sair desta página: o pedido
              continua sendo processado.
            </p>
          )}
          {order.status === 'rejected' && (
            <p role="alert" className="max-w-sm text-sm text-coral">
              {order.rejectionReason} Seu carrinho foi mantido.
            </p>
          )}
        </header>

        <dl className="grid grid-cols-2 gap-4 border-y border-primary px-6 py-4 text-text-secondary sm:grid-cols-4 sm:divide-x sm:divide-primary/60 sm:px-9">
          <div className="sm:pr-3">
            <dt className="text-sm font-bold">{order.txHash ? 'ID da transação' : 'Pedido'}</dt>
            <dd className="text-[15px]">{order.txHash ? shortAddress(order.txHash) : order.id}</dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-sm">Data</dt>
            <dd className="text-[15px]">
              <time dateTime={order.createdAt}>{dateFormatter.format(new Date(order.createdAt))}</time>
            </dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-sm">Total</dt>
            <dd className="text-[15px]">{formatEth(order.summary.totalEth)}</dd>
          </div>
          <div className="sm:pl-3">
            <dt className="text-sm font-bold">Carteira</dt>
            <dd className="text-[15px]">{WALLET_PROVIDERS[order.wallet.provider]}</dd>
          </div>
        </dl>

        <section aria-labelledby="order-details-title" className="flex flex-col gap-3 px-6 pt-5 pb-10 sm:px-11">
          <h2 id="order-details-title" className="text-[15px] font-bold">
            Detalhes da transação
          </h2>
          <PurchaseLines lines={order.lines} />
          <dl className="flex flex-col gap-2 border-t border-border pt-3 text-[15px]">
            {order.coupon && (
              <div className="flex justify-between">
                <dt>Desconto ({order.coupon.code})</dt>
                <dd className="text-success">(-) {formatEth(order.summary.discountEth)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(order.summary.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{formatEth(order.summary.totalEth)}</dd>
            </div>
          </dl>

          {order.status === 'confirmed' && (
            <>
              <p className="pt-2 text-sm leading-6 text-text-secondary">
                Transação confirmada na {networkName}. A propriedade foi transferida para sua carteira conectada (
                {shortAddress(order.wallet.address)}) e registrada na rede.
              </p>
              <button
                type="button"
                onClick={() => notAvailable('O explorador de blocos')}
                className="flex w-fit items-center gap-1 rounded-sm text-sm text-primary hover:underline"
              >
                Ver no Etherscan
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            {order.status === 'rejected' ? (
              <Button asChild>
                <Link to="/cart">Voltar ao carrinho</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/" hash="mercado">
                  Continuar explorando
                </Link>
              </Button>
            )}
          </div>
        </section>
      </article>
    </div>
  )
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pedido" className="flex justify-center pt-12">
      <Skeleton className="h-[640px] w-full max-w-[578px] rounded-lg" />
    </div>
  )
}

function OrderMessage({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex min-h-[50vh] flex-col items-start justify-center gap-4 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-text-secondary">{text}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

function OrderError({ error }: ErrorComponentProps) {
  const router = useRouter()
  if (isApiError(error) && error.code === 'FORBIDDEN') {
    return <OrderMessage title="Acesso negado" text="Este pedido pertence a outra conta." />
  }
  return (
    <section role="alert" className="flex min-h-[50vh] flex-col items-start justify-center gap-4 py-12">
      <h1 className="text-2xl font-bold">Não foi possível carregar o pedido</h1>
      <p className="text-sm text-text-secondary">{isApiError(error) ? error.message : 'Erro inesperado.'}</p>
      <Button onClick={() => router.invalidate()}>Tentar novamente</Button>
    </section>
  )
}
