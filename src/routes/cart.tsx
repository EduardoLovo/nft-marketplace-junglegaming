import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/placeholder-page'

export const Route = createFileRoute('/cart')({
  component: () => <PlaceholderPage title="Carrinho" />,
})
