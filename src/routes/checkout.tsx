import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/placeholder-page'

export const Route = createFileRoute('/checkout')({
  component: () => <PlaceholderPage title="Pagamento" />,
})
