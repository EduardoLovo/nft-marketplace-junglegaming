import { useState } from 'react'
import type { CatalogPage } from '@/contracts/catalog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { countActiveFilters } from '../search'
import { useCatalogSearch } from '../use-catalog-search'

type Facets = CatalogPage['facets']

/** Preço no formato do layout: vírgula decimal e duas casas ("0,02"). */
const formatPrice = (value: number) => value.toFixed(2).replace('.', ',')

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length > 0 ? next : undefined
}

function FacetList<T extends string>({
  title,
  facets,
  selected,
  onToggle,
}: {
  title: string
  facets: Array<{ value: T; label: string; count: number }>
  selected: T[] | undefined
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold text-foreground">{title}</legend>
      <ul className="flex flex-col px-3">
        {facets.map((facet) => {
          const active = selected?.includes(facet.value) ?? false
          return (
            <li key={facet.value}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(facet.value)}
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-sm text-[15px] leading-10 hover:text-kurio-accent',
                  active ? 'font-medium text-kurio-accent' : 'text-text-secondary',
                )}
              >
                <span className="flex items-center gap-2">
                  {/* Marcador visual além da cor, para o estado não depender só dela. */}
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', active ? 'bg-kurio-accent' : 'bg-transparent')}
                  />
                  {facet.label}
                </span>
                <span className="font-bold" aria-label={`${facet.count} itens`}>
                  ({facet.count})
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function PriceFilter({ range }: { range: Facets['priceRange'] | undefined }) {
  const { search, updateSearch } = useCatalogSearch()
  const bounds: [number, number] = range ? [Number(range.min), Number(range.max)] : [0, 0]
  const applied: [number, number] = [
    search.minPrice ? Number(search.minPrice) : bounds[0],
    search.maxPrice ? Number(search.maxPrice) : bounds[1],
  ]
  const [value, setValue] = useState<[number, number]>(applied)


  function apply() {
    const [min, max] = value
    updateSearch({
      // Um extremo igual ao limite do catálogo não é filtro: fica fora da URL.
      minPrice: min > bounds[0] ? min.toFixed(2) : undefined,
      maxPrice: max < bounds[1] ? max.toFixed(2) : undefined,
    })
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={!range}>
      <legend className="mb-3 text-lg leading-4 font-bold text-foreground">Faixa de preço</legend>
      <div className="flex flex-col gap-3 px-3">
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={0.01}
          minStepsBetweenThumbs={1}
          value={value}
          onValueChange={(next) => setValue([next[0], next[1]])}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          className="py-2"
        />
        <p className="text-[15px] leading-4" aria-live="polite">
          Preço: {formatPrice(value[0])} - {formatPrice(value[1])} ETH
        </p>
        <Button onClick={apply} className="h-9 w-fit rounded-[6px] px-3 text-base font-bold">
          Aplicar
        </Button>
      </div>
    </fieldset>
  )
}

export function CatalogFilters({ facets, className }: { facets: Facets | undefined; className?: string }) {
  const { search, updateSearch, clearFilters } = useCatalogSearch()
  const activeCount = countActiveFilters(search)

  return (
    <div className={cn('flex flex-col gap-10 bg-surface-card p-5', className)}>
      <FacetList
        title="Coleções"
        facets={facets?.categories ?? []}
        selected={search.categories}
        onToggle={(value) => updateSearch({ categories: toggle(search.categories, value) })}
      />
      {/* A key reinicia o slider quando a URL muda (voltar no histórico, limpar filtros). */}
      <PriceFilter
        key={[search.minPrice, search.maxPrice, facets?.priceRange.min, facets?.priceRange.max].join('|')}
        range={facets?.priceRange}
      />
      <FacetList
        title="Rede"
        facets={facets?.networks ?? []}
        selected={search.networks}
        onToggle={(value) => updateSearch({ networks: toggle(search.networks, value) })}
      />
      {activeCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="h-9">
          Limpar filtros ({activeCount})
        </Button>
      )}
    </div>
  )
}
