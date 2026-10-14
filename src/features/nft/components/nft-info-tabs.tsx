import { useInfiniteQuery } from '@tanstack/react-query'
import { NETWORKS, type NftDetail } from '@/contracts/catalog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nftReviewsQueryOptions } from '@/features/catalog/api'
import { formatRating } from '../format'
import { RatingStars } from './rating-stars'

const triggerClass =
  'h-auto flex-none rounded-none border-0 px-0 pb-3 text-[15px] lg:text-[17px] font-normal text-foreground data-active:font-bold data-active:text-primary group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px] after:bg-primary'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function Reviews({ nft }: { nft: NftDetail }) {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    nftReviewsQueryOptions(nft.id),
  )

  if (nft.rating.count === 0) {
    return <p className="text-sm text-text-secondary">Este NFT ainda não recebeu avaliações.</p>
  }
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando avaliações" className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        Não foi possível carregar as avaliações.
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const reviews = data.pages.flatMap((page) => page.items)
  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-center gap-3 text-sm">
        <RatingStars value={nft.rating.average} />
        <span>
          <strong>{formatRating(nft.rating.average)}</strong> de 5 · {nft.rating.count} avaliações
        </span>
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {reviews.map((review) => (
          <li key={review.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <strong>{review.author}</strong>
              <RatingStars value={review.rating} />
              <time dateTime={review.createdAt} className="text-text-muted">
                {dateFormatter.format(new Date(review.createdAt))}
              </time>
            </div>
            <p className="text-sm leading-6 text-text-secondary">{review.comment}</p>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button variant="outline" className="w-fit" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Carregando…' : 'Ver mais avaliações'}
        </Button>
      )}
    </div>
  )
}

export function NftInfoTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="details" className="gap-0">
      <TabsList variant="line" className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b-[0.3px] border-primary p-0 lg:gap-8">
        <TabsTrigger value="details" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={triggerClass}>
          Avaliações<span className="hidden sm:inline">&nbsp;de colecionadores</span> ({nft.rating.count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-3">
        <div className="flex flex-col gap-3 text-sm leading-6">
          {nft.story.split('\n\n').map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-text-secondary">
              {paragraph}
            </p>
          ))}
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="font-bold">Rede:</dt>
              <dd className="text-text-secondary">
                Cunhado na {NETWORKS[nft.network]} com procedência imutável e metadados armazenados no IPFS.
              </dd>
            </div>
            <div>
              <dt className="font-bold">Contrato:</dt>
              <dd className="text-text-secondary">
                {nft.contract.address} • Contrato inteligente {nft.contract.standard} verificado.
              </dd>
            </div>
            <div>
              <dt className="font-bold">Direitos autorais:</dt>
              <dd className="text-text-secondary">
                Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente
                pelos mercados compatíveis.
              </dd>
            </div>
          </dl>
        </div>
      </TabsContent>

      <TabsContent value="reviews" className="pt-3">
        <Reviews nft={nft} />
      </TabsContent>
    </Tabs>
  )
}
