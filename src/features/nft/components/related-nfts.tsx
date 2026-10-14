import { useQuery } from '@tanstack/react-query'
import type { NftDetail } from '@/contracts/catalog'
import { catalogQueryOptions } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'

const RELATED_COUNT = 5

/** "Mais desta coleção": outros NFTs da mesma coleção, sem o atual. */
export function RelatedNfts({ nft }: { nft: NftDetail }) {
  const { data, isPending, isError } = useQuery({
    ...catalogQueryOptions({
      collection: nft.collection.id,
      exclude: nft.id,
      sort: 'recent',
      page: 1,
      pageSize: RELATED_COUNT,
    }),
    // Ao trocar de NFT, não reaproveita a lista anterior: ela poderia conter
    // justamente o NFT que acabou de ser aberto.
    placeholderData: undefined,
  })

  // Seção complementar: em erro ou sem itens, some em vez de ocupar espaço.
  if (isError || (data && data.items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <h2 id="related-title" className="border-b-[0.3px] border-primary pb-3 text-[17px] font-bold text-primary">
        Mais desta coleção
      </h2>
      <ul
        aria-busy={isPending}
        className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5 lg:gap-7"
      >
        {isPending
          ? Array.from({ length: RELATED_COUNT }, (_, i) => (
              <li key={i} className="w-[45%] shrink-0 md:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : data.items.map((item) => (
              <li key={item.id} className="w-[45%] shrink-0 snap-start md:w-auto">
                <NftCard nft={item} />
              </li>
            ))}
      </ul>
    </section>
  )
}
