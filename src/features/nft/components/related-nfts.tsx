import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CatalogQuery, NftDetail } from '@/contracts/catalog'
import { catalogQueryOptions } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 5
/** O "Carousel Dots" do Figma tem três pontos: no máximo três páginas. */
const MAX_PAGES = 3

/**
 * Faixa de cinco NFTs com título e os pontos do Figma, que trocam a página
 * (o ativo fica preenchido). Usada no detalhe e no carrinho.
 */
export function PagedNftRow({
  title,
  titleId,
  query,
  spacing = 'tight',
  className,
}: {
  title: string
  titleId: string
  /** Filtros da consulta; a página e o tamanho vêm daqui. */
  query: Omit<CatalogQuery, 'page' | 'pageSize'>
  /** Espaço entre arte, nome e preço: 'tight' no detalhe, 'loose' (8px) no carrinho. */
  spacing?: 'tight' | 'loose'
  className?: string
}) {
  const [page, setPage] = useState(1)
  // Com outra consulta (ex.: outro NFT), a página volta para a primeira.
  const queryId = JSON.stringify(query)
  const [forQuery, setForQuery] = useState(queryId)
  if (forQuery !== queryId) {
    setForQuery(queryId)
    setPage(1)
  }

  const { data, isPending, isError } = useQuery({
    ...catalogQueryOptions({ ...query, page, pageSize: PAGE_SIZE }),
    // Entre páginas mantém a anterior na tela; com outra consulta não reaproveita
    // a lista (no detalhe ela poderia conter o NFT que acabou de ser aberto).
    placeholderData: (previous, previousQuery) => {
      const previousParams = previousQuery?.queryKey[2]
      if (typeof previousParams !== 'object') return undefined
      const { page: _page, pageSize: _size, ...rest } = previousParams
      return JSON.stringify(rest) === queryId ? keepPreviousData(previous) : undefined
    },
  })

  // Seção complementar: em erro ou sem itens, some em vez de ocupar espaço.
  if (isError || (data && data.items.length === 0)) return null
  const pages = Math.min(data?.totalPages ?? 1, MAX_PAGES)

  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col gap-8', className)}>
      <h2 id={titleId} className="border-b-[0.3px] border-primary pb-3 text-[17px] leading-4 font-bold text-primary">
        {title}
      </h2>
      <div className="flex flex-col items-center gap-8">
        <ul
          aria-busy={isPending}
          className="-mx-6 flex w-[calc(100%+3rem)] snap-x gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:w-full md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-5 lg:gap-7"
        >
          {isPending
            ? Array.from({ length: PAGE_SIZE }, (_, i) => (
                <li key={i} className="w-[45%] shrink-0 md:w-auto">
                  <NftCardSkeleton />
                </li>
              ))
            : data.items.map((item) => (
                <li key={item.id} className="w-[45%] shrink-0 snap-start md:w-auto">
                  <NftCard nft={item} compact={spacing === 'loose' ? 'loose' : true} />
                </li>
              ))}
        </ul>
        {/* Pontos de 12px do Figma dentro de áreas de toque de 24px (acessibilidade). */}
        {pages > 1 && (
          <div role="group" aria-label={`Páginas de ${title}`} className="flex">
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Página ${index + 1}`}
                aria-pressed={page === index + 1}
                onClick={() => setPage(index + 1)}
                className="group flex size-6 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-3 rounded-full border-[1.3px] border-primary',
                    page === index + 1 ? 'bg-primary' : 'group-hover:bg-primary/30',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** "Mais desta coleção": outros NFTs da mesma coleção, sem o atual. */
export function RelatedNfts({ nft }: { nft: NftDetail }) {
  return (
    <PagedNftRow
      title="Mais desta coleção"
      titleId="related-title"
      query={{ collection: nft.collection.id, exclude: nft.id, sort: 'recent' }}
    />
  )
}
