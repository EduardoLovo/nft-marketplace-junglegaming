import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Páginas exibidas: primeira, última e vizinhas da atual, com reticências
 * nos saltos (ex.: 1 … 4 5 6 … 12).
 */
function pageItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? ['gap' as const, page] : [page]))
}

const itemClass =
  'flex size-[35px] items-center justify-center rounded-[4px] border border-border text-lg leading-4 hover:border-primary disabled:pointer-events-none disabled:opacity-40'

export function CatalogPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <button
            type="button"
            className={itemClass}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(itemClass, item === page && 'border-primary bg-primary font-bold text-ink')}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={itemClass}
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRightIcon className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
