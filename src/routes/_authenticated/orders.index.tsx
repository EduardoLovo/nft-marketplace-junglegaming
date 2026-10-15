import { createFileRoute, Link } from '@tanstack/react-router'
import { ReceiptIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrderStatus } from '@/contracts/checkout'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useOrders } from '@/features/checkout/api'
import { formatEth } from '@/lib/eth'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Processando', className: 'border-amber/50 text-amber' },
  confirmed: { label: 'Confirmado', className: 'border-success/50 text-success' },
  rejected: { label: 'Recusado', className: 'border-coral/50 text-coral' },
}

function OrdersPage() {
  useDocumentTitle('Meus pedidos')
  const { data: orders, isPending, isError, refetch } = useOrders()

  return (
    <AccountLayout title="Meus pedidos">
      {isPending ? (
        <div aria-busy="true" aria-label="Carregando pedidos" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
          Não foi possível carregar seus pedidos.
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-card p-6">
          <ReceiptIcon className="size-8 text-primary" aria-hidden="true" />
          <h2 className="font-bold">Você ainda não fez pedidos</h2>
          <p className="text-sm text-text-secondary">Seus recibos aparecem aqui depois da primeira compra.</p>
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const units = order.lines.reduce((sum, line) => sum + line.quantity, 0)
            const status = STATUS[order.status]
            return (
              <li key={order.id}>
                <Link
                  to="/checkout"
                  search={{ pedido: order.id }}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-4 transition-colors hover:border-primary sm:flex-row sm:items-center"
                >
                  <div className="flex -space-x-3" aria-hidden="true">
                    {order.lines.slice(0, 3).map((line) => (
                      <img
                        key={line.editionId}
                        src={line.image.src}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                        className="size-11 rounded-md border-2 border-surface-card object-cover"
                      />
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-bold">
                      {order.lines[0]?.name}
                      {order.lines.length > 1 && ` e mais ${order.lines.length - 1}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      <time dateTime={order.createdAt}>{dateFormatter.format(new Date(order.createdAt))}</time> ·{' '}
                      {units} {units === 1 ? 'unidade' : 'unidades'} · {order.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', status.className)}>
                      {status.label}
                    </span>
                    <span className="font-bold text-primary">{formatEth(order.summary.totalEth)}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AccountLayout>
  )
}
