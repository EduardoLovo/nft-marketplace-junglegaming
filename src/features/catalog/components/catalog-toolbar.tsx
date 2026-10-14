import { ChevronDownIcon, XIcon } from 'lucide-react'
import { useId } from 'react'
import { CATALOG_SORTS, CATALOG_TABS, type CatalogSort, type CatalogTab } from '@/contracts/catalog'
import { cn } from '@/lib/utils'
import { useCatalogSearch } from '../use-catalog-search'

export function CatalogToolbar() {
  const { search, updateSearch } = useCatalogSearch()
  const sortId = useId()
  const activeTab = search.tab ?? 'all'

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="Seções do catálogo">
        <ul className="flex gap-4 overflow-x-auto lg:gap-5">
          {(Object.entries(CATALOG_TABS) as Array<[CatalogTab, string]>).map(([tab, label]) => {
            const active = tab === activeTab
            return (
              <li key={tab} className="shrink-0">
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => updateSearch({ tab: tab === 'all' ? undefined : tab })}
                  className={cn(
                    'relative rounded-sm pb-1.5 text-sm leading-4 lg:text-[15px] lg:font-medium',
                    active
                      ? 'font-bold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                      : 'text-foreground hover:text-kurio-accent',
                  )}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2 text-[15px] leading-4">
        <label htmlFor={sortId}>Ordenar por:</label>
        <div className="relative">
          <select
            id={sortId}
            value={search.sort ?? 'recent'}
            onChange={(event) => {
              const sort = event.target.value as CatalogSort
              updateSearch({ sort: sort === 'recent' ? undefined : sort })
            }}
            className="appearance-none rounded-sm bg-transparent py-1 pr-6 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {(Object.entries(CATALOG_SORTS) as Array<[CatalogSort, string]>).map(([value, label]) => (
              <option key={value} value={value} className="bg-surface-card">
                {label}
              </option>
            ))}
          </select>
          <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2" />
        </div>
      </div>
    </div>
  )
}

/** Mostra o termo buscado com opção de remover (a busca do header não fica visível no catálogo). */
export function ActiveSearch() {
  const { search, updateSearch } = useCatalogSearch()
  if (!search.q) return null
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
      Resultados para <strong className="text-foreground">“{search.q}”</strong>
      <button
        type="button"
        onClick={() => updateSearch({ q: undefined })}
        className="inline-flex items-center gap-1 rounded-sm text-kurio-accent hover:underline"
      >
        <XIcon className="size-3.5" aria-hidden="true" />
        Limpar busca
      </button>
    </p>
  )
}
