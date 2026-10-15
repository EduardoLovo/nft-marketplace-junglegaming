import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Links antigos e diretos de pedido: a confirmação é o modal do Figma sobre o
 * pagamento (`/checkout?pedido=…`), que recupera o pedido do servidor.
 */
export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/checkout', search: { pedido: params.orderId }, replace: true })
  },
})
