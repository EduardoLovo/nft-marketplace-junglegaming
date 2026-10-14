import { getRouteApi } from '@tanstack/react-router'
import type { CatalogSearch } from './search'

const homeRoute = getRouteApi('/')

/**
 * Estado do catálogo lido e escrito na URL. Qualquer mudança de filtro volta
 * para a 1ª página, a menos que o próprio patch defina `page`.
 */
export function useCatalogSearch() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  function updateSearch(patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) {
    navigate({
      search: (prev) => ({ ...prev, page: undefined, ...patch }),
      replace: options.replace,
      // Filtrar não deve jogar a página para o topo.
      resetScroll: false,
    })
  }

  function clearFilters() {
    navigate({ search: (prev) => ({ q: prev.q, tab: prev.tab, sort: prev.sort }), resetScroll: false })
  }

  return { search, updateSearch, clearFilters }
}
