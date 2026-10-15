import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Quantas páginas numeradas aparecem por vez, como no Figma (1 2 3 4 >). */
const VISIBLE_PAGES = 4

/**
 * Janela de até 4 páginas que acompanha a atual: ela fica na segunda posição
 * (ex.: 2 3 4 5 na página 3), exceto perto do início e do fim.
 */
function pageItems(current: number, total: number): number[] {
  const count = Math.min(VISIBLE_PAGES, total)
  const start = Math.max(1, Math.min(current - 1, total - count + 1))
  return Array.from({ length: count }, (_, i) => start + i)
}

const itemClass =
  'flex size-[35px] items-center justify-center rounded-[4px] border border-border text-lg leading-4 hover:border-primary'

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
        {/* Como no Figma, a seta só aparece quando há para onde ir. */}
        {page > 1 && (
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => onChange(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeftIcon className="size-[18px]" aria-hidden="true" />
            </button>
          </li>
        )}
        {pageItems(page, totalPages).map((item) => (
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
        ))}
        {page < totalPages && (
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => onChange(page + 1)}
              aria-label="Próxima página"
            >
              <ChevronRightIcon className="size-[18px]" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
