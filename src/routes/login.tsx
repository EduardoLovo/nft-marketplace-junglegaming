import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/placeholder-page'

export const Route = createFileRoute('/login')({
  component: () => <PlaceholderPage title="Entrar" />,
})
