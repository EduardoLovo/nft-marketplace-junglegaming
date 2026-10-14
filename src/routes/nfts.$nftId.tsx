import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/placeholder-page'

export const Route = createFileRoute('/nfts/$nftId')({
  component: () => <PlaceholderPage title="Detalhes do NFT" />,
})
