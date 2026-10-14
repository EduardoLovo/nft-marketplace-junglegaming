import { createFileRoute, Link } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountLayout } from '@/features/account/components/account-layout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavorites } from '@/features/favorites/api'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  useDocumentTitle('Lista de interesse')
  const { data: favorites, isPending, isError, refetch } = useFavorites()

  return (
    <AccountLayout title="Lista de interesse">
      {isPending ? (
        <div aria-busy="true" aria-label="Carregando favoritos" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-7">
          {Array.from({ length: 3 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
          Não foi possível carregar sua lista de interesse.
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-card p-6">
          <HeartIcon className="size-8 text-primary" aria-hidden="true" />
          <h2 className="font-bold">Sua lista de interesse está vazia</h2>
          <p className="text-sm text-text-secondary">Toque no coração de um NFT para acompanhá-lo por aqui.</p>
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-secondary" aria-live="polite">
            {favorites.length} {favorites.length === 1 ? 'NFT salvo' : 'NFTs salvos'}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-7 lg:gap-y-10">
            {favorites.map((nft) => (
              <li key={nft.id} className="relative">
                <NftCard nft={nft} />
                {/* No desktop o card não tem coração (Figma); aqui ele é necessário para remover. */}
                <FavoriteButton nft={nft} className="absolute top-3 right-3 hidden size-8 lg:flex" />
              </li>
            ))}
          </ul>
        </>
      )}
    </AccountLayout>
  )
}
