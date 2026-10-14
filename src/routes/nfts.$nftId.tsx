import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { EditionKind } from '@/contracts/catalog'
import { useAddToCart } from '@/features/cart/hooks'
import { nftQueryOptions } from '@/features/catalog/api'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { EditionPicker } from '@/features/nft/components/edition-picker'
import { NftDetailSkeleton } from '@/features/nft/components/nft-detail-skeleton'
import { NftGallery } from '@/features/nft/components/nft-gallery'
import { NftInfoTabs } from '@/features/nft/components/nft-info-tabs'
import { QuantityStepper } from '@/features/nft/components/quantity-stepper'
import { RatingStars } from '@/features/nft/components/rating-stars'
import { RelatedNfts } from '@/features/nft/components/related-nfts'
import { ShareButton } from '@/features/nft/components/share-button'
import { formatRating } from '@/features/nft/format'
import { defaultEdition, EDITION_KINDS, maxQuantity, resolveEdition, stockLabel } from '@/features/nft/editions'
import { isApiError } from '@/lib/api/errors'
import { formatEth, multiplyEth } from '@/lib/eth'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: z.object({
    edition: z.enum(EDITION_KINDS as [EditionKind, ...EditionKind[]]).optional().catch(undefined),
  }),
  // Acesso direto (link ou refresh) espera o NFT para já renderizar a página
  // completa; um 404 da API vira a página de "NFT não encontrado".
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(nftQueryOptions(params.nftId))
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  pendingMs: 150,
  pendingComponent: NftDetailSkeleton,
  notFoundComponent: NftNotFound,
  errorComponent: NftError,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: nft } = useSuspenseQuery(nftQueryOptions(nftId))
  const [quantity, setQuantity] = useState(1)

  const edition = resolveEdition(nft, search.edition)
  const max = maxQuantity(edition)
  // Se o estoque cair em segundo plano, a quantidade escolhida se ajusta sozinha.
  const effectiveQuantity = Math.min(quantity, Math.max(max, 1))
  const soldOut = nft.status === 'sold-out'
  const total = multiplyEth(edition.priceEth, effectiveQuantity)

  useDocumentTitle(nft.name)

  function selectEdition(kind: EditionKind) {
    setQuantity(1)
    navigate({
      search: { edition: kind === defaultEdition(nft).kind ? undefined : kind },
      replace: true,
      resetScroll: false,
    })
  }

  const addToCart = useAddToCart()
  const appNavigate = useNavigate()
  const canBuy = !soldOut && max > 0 && !addToCart.isPending

  /** `goToCart`: "Comprar" leva ao carrinho; o ícone de carrinho só adiciona. */
  function add(goToCart: boolean) {
    // O botão fica desabilitado enquanto a requisição está em voo, evitando duplicar o item.
    addToCart.mutate(
      { editionId: edition.id, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          setQuantity(1)
          if (goToCart) {
            appNavigate({ to: '/cart' })
          } else {
            toast.success(`${nft.name} adicionado ao carrinho`, {
              action: { label: 'Ver carrinho', onClick: () => appNavigate({ to: '/cart' }) },
            })
          }
        },
      },
    )
  }

  const buyLabel = soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'Comprar'

  return (
    <div className="flex flex-col gap-12 pt-2 pb-44 lg:gap-24 lg:pt-8 lg:pb-0">
      <section aria-labelledby="nft-title" className="flex flex-col gap-3">
        <nav aria-label="Trilha de navegação" className="text-[15px] leading-4 font-bold">
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
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row">
          <NftGallery image={nft.image} />

          <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[595px] lg:justify-between">
            <header className="flex flex-col gap-3 border-b-[0.3px] border-primary pb-3">
              <div className="flex items-start justify-between gap-3">
                <h1 id="nft-title" className="text-xl leading-tight font-bold lg:text-[28px] lg:leading-[37px]">
                  {nft.name}
                </h1>
                {/* No mobile, o favorito é o coração do Figma; no desktop fica ao lado de Comprar. */}
                <FavoriteButton nft={nft} className="shrink-0 lg:hidden" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[22px] leading-4 font-bold text-primary">
                  <span className="sr-only">Preço da edição {edition.label}: </span>
                  {formatEth(edition.priceEth)}
                </p>
                <p className="flex items-center gap-2 text-[15px] leading-4">
                  <RatingStars value={nft.rating.average} />
                  <span>
                    <span className="sr-only">{formatRating(nft.rating.average)} de 5, </span>
                    {nft.rating.count} avaliações de colecionadores
                  </span>
                </p>
              </div>
            </header>

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
            </div>

            <EditionPicker editions={nft.editions} selected={edition.kind} onSelect={selectEdition} />

            {/* Compra no desktop. No mobile ela fica na barra fixa inferior. */}
            <div className="hidden flex-col gap-2 lg:flex">
              <div className="flex items-center gap-4">
                <QuantityStepper
                  value={effectiveQuantity}
                  max={max}
                  onChange={setQuantity}
                  disabled={soldOut}
                />
                <div className="ml-auto flex gap-2">
                  <Button
                    disabled={!canBuy}
                    onClick={() => add(true)}
                    className="h-10 w-[130px] rounded-[6px] text-sm font-bold uppercase"
                  >
                    {buyLabel}
                  </Button>
                  <FavoriteButton nft={nft} variant="button" />
                </div>
              </div>
              <p className="text-xs text-text-muted" aria-live="polite">
                {stockLabel(edition)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <dl className="flex flex-col gap-3 text-[15px] leading-5 text-text-muted">
                <div className="flex gap-1">
                  <dt>ID do token:</dt>
                  <dd>{nft.tokenId}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Coleção:</dt>
                  <dd>{nft.collection.name}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Atributos:</dt>
                  <dd>{nft.attributes.join(', ')}</dd>
                </div>
              </dl>
              <p className="flex items-center gap-2 text-[15px] leading-4 font-bold">
                Compartilhar este NFT:
                <ShareButton title={nft.name} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <NftInfoTabs nft={nft} />
      <RelatedNfts nft={nft} />

      {/* Barra de compra fixa do mobile, como no Figma. */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-surface-card px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_0_20px_rgb(10_6_4/0.45)] lg:hidden">
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium text-text-secondary">Qtd.</span>
              <QuantityStepper
                value={effectiveQuantity}
                max={max}
                onChange={setQuantity}
                size="sm"
                disabled={soldOut}
              />
            </div>
            <p className="text-xl leading-4 font-bold text-primary">
              <span className="sr-only">Total: </span>
              {formatEth(total)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              disabled={!canBuy}
              onClick={() => add(true)}
              className="h-[60px] flex-1 rounded-[40px] bg-linear-to-b from-primary to-primary/80 text-base font-bold text-foreground"
            >
              {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'Comprar NFT'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!canBuy}
              onClick={() => add(false)}
              aria-label="Adicionar ao carrinho"
              className="size-[60px] rounded-full border-border bg-surface-raised dark:border-border dark:bg-surface-raised"
            >
              <ShoppingCartIcon className="size-5" />
            </Button>
          </div>
          <p className="text-center text-xs text-text-muted">{stockLabel(edition)}</p>
        </div>
      </div>
    </div>
  )
}

function NftNotFound() {
  return (
    <section className="flex min-h-[50vh] flex-col items-start justify-center gap-6 py-12">
      <p className="text-sm font-medium uppercase text-kurio-accent">Erro 404</p>
      <h1 className="text-3xl font-bold uppercase">NFT não encontrado</h1>
      <p className="text-sm leading-6 text-text-secondary">
        Este NFT não existe ou foi removido do mercado. Confira o endereço ou explore outras obras.
      </p>
      <Button asChild size="lg" className="h-10 px-8 font-bold uppercase">
        <Link to="/" hash="mercado">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Voltar ao mercado
        </Link>
      </Button>
    </section>
  )
}

function NftError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <section role="alert" className="flex min-h-[50vh] flex-col items-start justify-center gap-6 py-12">
      <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
      <p className="text-sm leading-6 text-text-secondary">
        {isApiError(error) ? error.message : 'Ocorreu um erro inesperado.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => router.invalidate()}>Tentar novamente</Button>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </section>
  )
}
