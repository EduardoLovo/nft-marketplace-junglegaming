import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { isApiError } from '@/lib/api/errors'
import { catalogQueryOptions } from '../api'
import { countActiveFilters, toCatalogQuery } from '../search'
import { useCatalogSearch } from '../use-catalog-search'
import { CatalogFilters } from './catalog-filters'
import { FilterIcon, SearchIcon } from './catalog-icons'
import { CatalogPagination } from './catalog-pagination'
import { ActiveSearch, CatalogToolbar, SortSelect } from './catalog-toolbar'
import { FeaturedBanner } from './featured-banner'
import { NftCard, NftCardSkeleton } from './nft-card'

const SEARCH_DEBOUNCE_MS = 300

/** Busca do mobile: atualiza a URL enquanto digita, sem empilhar histórico. */
function MobileSearch() {
  const { search, updateSearch } = useCatalogSearch()
  const [term, setTerm] = useState(search.q ?? '')
  const inputId = useId()

  // Reflete mudanças externas da URL (ex.: voltar no histórico).
  const [syncedQ, setSyncedQ] = useState(search.q)
  if (search.q !== syncedQ) {
    setSyncedQ(search.q)
    setTerm(search.q ?? '')
  }

  useEffect(() => {
    const q = term.trim() || undefined
    if (q === search.q) return
    const timer = setTimeout(() => updateSearch({ q }, { replace: true }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, search.q, updateSearch])

  return (
    <div role="search" className="flex h-[45px] flex-1 items-center gap-2 rounded-[10px] bg-surface-card px-3">
      <SearchIcon className="size-[22px] shrink-0 text-kurio-secondary" />
      <label htmlFor={inputId} className="sr-only">
        Buscar NFTs, coleções ou criadores
      </label>
      <input
        id={inputId}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Explorar coleções"
        className="h-full min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold placeholder:text-text-muted focus-visible:outline-none"
      />
    </div>
  )
}

/**
 * Busca e filtros do mobile ("Search Bar" do Figma), acima do hero. Os filtros
 * abrem num painel lateral; a contagem de facetas vem da mesma consulta do catálogo.
 */
export function MobileCatalogBar() {
  const { search } = useCatalogSearch()
  const { data } = useQuery(catalogQueryOptions(toCatalogQuery(search)))
  const activeFilters = countActiveFilters(search)

  return (
    <div className="flex gap-2 lg:hidden">
      <MobileSearch />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            aria-label={activeFilters > 0 ? `Filtros (${activeFilters} ativos)` : 'Filtros'}
            className="relative size-[45px] rounded-[14px] bg-linear-to-b from-primary/45 to-primary"
          >
            <FilterIcon className="size-[22px] text-ink" />
            {activeFilters > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-[10px] font-bold text-ink">
                {activeFilters}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(340px,90vw)] overflow-y-auto border-border bg-surface-card p-0">
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados são atualizados a cada alteração.</SheetDescription>
          </SheetHeader>
          {/* O Figma mobile não tem "Ordenar por" na tela: a ordenação fica aqui. */}
          <div className="px-5 pt-4">
            <SortSelect />
          </div>
          <CatalogFilters facets={data?.facets} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function CatalogSection() {
  const { search, updateSearch } = useCatalogSearch()
  const query = toCatalogQuery(search)
  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useQuery(catalogQueryOptions(query))
  const sectionRef = useRef<HTMLElement>(null)
  const activeFilters = countActiveFilters(search)

  function changePage(page: number) {
    updateSearch({ page: page > 1 ? page : undefined })
    // Leva o usuário de volta ao início da grade, preservando o contexto.
    sectionRef.current?.scrollIntoView({ block: 'start' })
    sectionRef.current?.focus({ preventScroll: true })
  }

  const resultsMessage = data
    ? data.total === 0
      ? 'Nenhum NFT encontrado.'
      : `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}. Página ${data.page} de ${data.totalPages}.`
    : ''

  return (
    <section
      ref={sectionRef}
      id="mercado"
      tabIndex={-1}
      aria-labelledby="catalog-title"
      className="flex scroll-mt-4 flex-col gap-4 outline-none lg:flex-row lg:gap-12"
    >
      <h2 id="catalog-title" className="sr-only">
        Mercado de NFTs
      </h2>

      <div className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
        <CatalogFilters facets={data?.facets} />
        <FeaturedBanner />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-8">
        <CatalogToolbar />
        <ActiveSearch />

        {/* Anuncia o resultado de cada busca/filtro para leitores de tela. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {isFetching ? 'Carregando NFTs…' : resultsMessage}
        </p>

        {isPending ? (
          <div aria-busy="true" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            {Array.from({ length: 9 }, (_, i) => (
              <NftCardSkeleton key={i} />
            ))}
          </div>
        ) : error && !data ? (
          <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-card p-6">
            <h3 className="text-lg font-bold">Não foi possível carregar os NFTs</h3>
            <p className="text-sm text-text-secondary">
              {isApiError(error) ? error.message : 'Ocorreu um erro inesperado.'}
            </p>
            <Button onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-card p-6">
            <h3 className="text-lg font-bold">Nenhum NFT encontrado</h3>
            <p className="text-sm text-text-secondary">
              {data.page > 1 && data.total > 0
                ? 'Esta página não existe para os filtros atuais.'
                : 'Tente outros termos de busca ou remova alguns filtros.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {data.page > 1 && data.total > 0 ? (
                <Button onClick={() => changePage(1)}>Ir para a primeira página</Button>
              ) : (
                (activeFilters > 0 || search.q) && (
                  <Button
                    onClick={() =>
                      updateSearch({ q: undefined, categories: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined })
                    }
                  >
                    Limpar busca e filtros
                  </Button>
                )
              )}
            </div>
          </div>
        ) : data ? (
          <>
            {error && (
              <p role="alert" className="text-sm text-coral">
                Não foi possível atualizar os resultados.{' '}
                <button type="button" className="underline" onClick={() => refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            <ul
              aria-busy={isPlaceholderData}
              // Mobile: grade em mosaico do Figma, com a coluna da direita 32px abaixo.
              // O deslocamento é visual (translate) e o padding final compensa.
              className="grid grid-cols-2 gap-x-4 gap-y-6 transition-opacity aria-busy:opacity-60 max-md:pb-8 md:grid-cols-3 lg:gap-x-[34px] lg:gap-y-[72px]"
            >
              {data.items.map((nft, index) => (
                <li key={nft.id} data-col={index % 2 ? 'right' : 'left'} className="max-md:data-[col=right]:translate-y-8">
                  <NftCard nft={nft} priority={index < 3} />
                </li>
              ))}
            </ul>
            <div className="flex justify-center lg:mt-14 lg:justify-end">
              <CatalogPagination page={data.page} totalPages={data.totalPages} onChange={changePage} />
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
