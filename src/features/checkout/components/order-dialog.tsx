import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleXIcon, Loader2Icon, XIcon } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/contracts/checkout'
import { PAYMENT_NETWORKS, shortAddress, WALLET_PROVIDERS } from '@/contracts/wallets'
import { useOwnerKey } from '@/features/auth/use-session'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/eth'
import { notAvailable } from '@/lib/not-available'
import { useDocumentTitle } from '@/lib/use-document-title'
import { orderQueryOptions, refreshAfterSettlement } from '../api'
import { ThankYouIcon } from './checkout-icons'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Data no formato do Figma: "29 Jul, 2026". */
const formatOrderDate = (iso: string) => {
  const date = new Date(iso)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

const STATUS_COPY: Record<Order['status'], { title: string; announce: string; documentTitle: string }> = {
  pending: { title: 'Processando seu pagamento', announce: 'Pedido em processamento.', documentTitle: 'Processando pedido' },
  confirmed: { title: 'Seus NFTs agora estão na sua carteira', announce: 'Pagamento confirmado.', documentTitle: 'Pedido confirmado' },
  rejected: { title: 'Pagamento recusado', announce: 'Pagamento recusado.', documentTitle: 'Pagamento recusado' },
}

/** Uma coluna da faixa "ID da transação · Data · Total · Carteira" do Figma. */
function MetaItem({ label, value, bold = false }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col whitespace-nowrap text-text-secondary">
      <dt className={bold ? 'text-sm leading-4 font-bold' : 'text-sm leading-4'}>{label}</dt>
      <dd className="text-[15px] leading-5">{value}</dd>
    </div>
  )
}

function OrderBody({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const previousStatus = useRef(order.status)
  const copy = STATUS_COPY[order.status]
  const networkName = PAYMENT_NETWORKS[order.network]
  useDocumentTitle(copy.documentTitle)

  // Ao sair de "pendente", carrinho (itens comprados saem) e estoque mudaram.
  useEffect(() => {
    if (previousStatus.current === 'pending' && order.status !== 'pending') refreshAfterSettlement(queryClient)
    previousStatus.current = order.status
  }, [order.status, queryClient])

  const meta = [
    { label: order.txHash ? 'ID da transação' : 'Pedido', value: order.txHash ? shortAddress(order.txHash) : order.id, bold: true },
    { label: 'Data', value: <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time> },
    { label: 'Total', value: formatEth(order.summary.totalEth) },
    { label: 'Carteira', value: WALLET_PROVIDERS[order.wallet.provider], bold: true },
  ]

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {copy.announce}
      </p>
      {/* "Modal Header": ícone de 80px e o título, centralizados numa faixa de 156px. */}
      <header className="flex min-h-[156px] flex-col items-center justify-center gap-4 px-6 py-5 text-center">
        {order.status === 'confirmed' && <ThankYouIcon className="size-20 text-primary" />}
        {order.status === 'pending' && (
          <Loader2Icon className="size-20 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        )}
        {order.status === 'rejected' && <CircleXIcon className="size-20 text-coral" aria-hidden="true" />}
        <DialogTitle className="text-base leading-4 font-bold text-text-secondary">{copy.title}</DialogTitle>
        {order.status === 'pending' && (
          <DialogDescription className="max-w-sm text-sm text-text-muted">
            Aguardando a confirmação da carteira na rede {networkName}. Você pode fechar esta janela: o pedido continua
            sendo processado.
          </DialogDescription>
        )}
        {order.status !== 'pending' && <DialogDescription className="sr-only">Resumo do pedido {order.id}.</DialogDescription>}
      </header>

      {/* "Transaction Meta": quatro colunas separadas por traços cobre de 31px. */}
      <dl className="grid grid-cols-2 gap-4 border-y border-primary px-6 py-4 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-9 sm:py-[14.5px]">
        {meta.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <span aria-hidden="true" className="mt-[2.5px] hidden h-px max-w-[31px] min-w-2 flex-1 bg-primary sm:block" />}
            <MetaItem {...item} />
          </Fragment>
        ))}
      </dl>

      {/* "Transaction Details": itens, taxa e total, nota e Etherscan. */}
      <section aria-labelledby="order-details-title" className="flex flex-col gap-3 px-6 pt-5 pb-10 sm:px-11">
        <h2 id="order-details-title" className="text-[15px] leading-4 font-bold">
          Detalhes da transação
        </h2>
        <div aria-hidden="true" className="flex justify-between border-b-[0.3px] border-primary pb-3 text-base leading-4">
          <span className="font-bold">NFTs</span>
          <span className="flex gap-3 sm:w-[193px] sm:gap-12">
            <span className="font-bold">Edições</span>
            <span className="font-medium">Subtotal</span>
          </span>
        </div>
        <ul className="flex flex-col gap-3">
          {order.lines.map((line) => (
            <li key={line.editionId} className="flex min-h-[70px] items-center justify-between gap-3 bg-surface-card">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={line.image.src}
                  srcSet={line.image.srcSet}
                  sizes="70px"
                  width={70}
                  height={70}
                  alt=""
                  className="size-[70px] shrink-0 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="truncate text-base leading-4 font-bold">{line.name}</p>
                  <p className="text-sm leading-4 whitespace-nowrap text-text-muted">
                    ID do token: {line.tokenId}
                    <span className="sr-only">, edição {line.editionLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:gap-12">
                <p className="w-[43px] text-right text-sm leading-4 text-text-secondary">(x {line.quantity})</p>
                <p className="min-w-[87px] text-right text-lg leading-4 font-bold text-primary">{formatEth(line.lineTotalEth)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-3 text-[15px] leading-5">
          {order.coupon && (
            <div className="flex justify-between">
              <dt>Desconto ({order.coupon.code})</dt>
              <dd className="text-success">(-) {formatEth(order.summary.discountEth)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd className="text-lg leading-5">{formatEth(order.summary.networkFeeEth)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-base leading-4 font-bold">Total</dt>
            <dd className="text-lg leading-4 font-bold text-primary">{formatEth(order.summary.totalEth)}</dd>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-6 border-t-[0.3px] border-primary pt-4 text-center">
          {order.status === 'confirmed' && (
            <>
              <p className="text-sm leading-[22px] text-text-secondary">
                Transação confirmada na {networkName}. A propriedade foi transferida para sua carteira conectada e
                registrada na rede.
              </p>
              <Button
                type="button"
                onClick={() => notAvailable('O explorador de blocos')}
                className="h-12 w-[186px] rounded-[5px] text-base leading-4 font-bold"
              >
                Ver no Etherscan
              </Button>
            </>
          )}
          {order.status === 'pending' && (
            <p className="text-sm leading-[22px] text-text-secondary">
              A confirmação chega em tempo real. Esta janela atualiza sozinha.
            </p>
          )}
          {order.status === 'rejected' && (
            <>
              <p role="alert" className="text-sm leading-[22px] text-coral">
                {order.rejectionReason} Seu carrinho foi mantido.
              </p>
              <Button asChild className="h-12 w-[186px] rounded-[5px] text-base leading-4 font-bold">
                <Link to="/cart">Voltar ao carrinho</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  )
}

/**
 * "Order Confirmation Modal" do Figma (578px, faixa cobre na base), aberto
 * sobre o pagamento pelo parâmetro `?pedido=`. Mostra também os estados
 * "processando" e "recusado", que mudam em tempo real.
 */
export function OrderDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const owner = useOwnerKey()
  const { data: order, error, isPending, refetch } = useQuery(orderQueryOptions(owner, orderId))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        // Foco inicial no próprio modal (o leitor de tela lê o título), não no X.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        className="flex max-h-dvh flex-col gap-0 overflow-y-auto bg-surface-card p-0 ring-0 sm:max-w-[578px] sm:rounded-none max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none"
      >
        {/* X do Figma: 18px no canto superior direito. */}
        <DialogClose aria-label="Fechar" className="absolute top-[13px] right-[9px] z-10 rounded-sm text-primary hover:text-primary-light">
          <XIcon className="size-6" aria-hidden="true" />
        </DialogClose>
        {isPending ? (
          <div aria-busy="true" aria-label="Carregando pedido" className="flex flex-col gap-4 p-8">
            <DialogTitle className="sr-only">Carregando pedido</DialogTitle>
            <DialogDescription className="sr-only">Buscando os dados do pedido.</DialogDescription>
            <Skeleton className="mx-auto size-20 rounded-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-4 p-8">
            <DialogTitle className="text-lg font-bold">
              {isApiError(error) && error.code === 'NOT_FOUND'
                ? 'Pedido não encontrado'
                : isApiError(error) && error.code === 'FORBIDDEN'
                  ? 'Acesso negado'
                  : 'Não foi possível carregar o pedido'}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">
              {isApiError(error) && error.code === 'FORBIDDEN'
                ? 'Este pedido pertence a outra conta.'
                : isApiError(error)
                  ? error.message
                  : 'Erro inesperado.'}
            </DialogDescription>
            {!(isApiError(error) && ['NOT_FOUND', 'FORBIDDEN'].includes(error.code)) && (
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            )}
          </div>
        ) : (
          <OrderBody order={order} />
        )}
        <div aria-hidden="true" className="mt-auto h-2.5 shrink-0 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}
