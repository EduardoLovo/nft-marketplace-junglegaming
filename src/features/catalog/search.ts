import { z } from 'zod'
import {
  CATALOG_SORTS,
  CATALOG_TABS,
  DEFAULT_PAGE_SIZE,
  NETWORKS,
  NFT_CATEGORIES,
  type CatalogQuery,
  type CatalogSort,
  type CatalogTab,
  type Network,
  type NftCategory,
} from '@/contracts/catalog'
import { isEthAmount } from '@/lib/eth'

const keysOf = <T extends string>(record: Record<T, string>) => Object.keys(record) as [T, ...T[]]

/**
 * Lista na URL em CSV (`?categories=music,gaming`). Itens desconhecidos são
 * descartados em vez de invalidar a URL inteira, para um link antigo ou
 * editado à mão continuar abrindo.
 */
function csvList<T extends string>(allowed: Record<T, string>) {
  return z
    .unknown()
    .transform((value) => {
      const items = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : []
      const valid = items.filter((item): item is T => typeof item === 'string' && item in allowed)
      return valid.length > 0 ? Array.from(new Set(valid)) : undefined
    })
    .optional()
}

/**
 * O decodificador de query string do router converte valores com cara de
 * número (`3.46`, `42`) em `number` antes da validação. Para campos de texto
 * isso é voltado a string; a conversão é exata, porque o router só converte
 * quando `String(numero)` reproduz o texto original.
 */
const asText = (value: unknown) => (typeof value === 'number' ? String(value) : value)

const ethAmount = z
  .unknown()
  .transform((value) => {
    const text = asText(value)
    return typeof text === 'string' && isEthAmount(text) ? text : undefined
  })
  .optional()

/**
 * Estado do catálogo na URL. Valores padrão ficam fora da URL (`undefined`)
 * para os links continuarem curtos; valores inválidos caem no padrão.
 */
export const catalogSearchSchema = z.object({
  q: z
    .preprocess(asText, z.string().trim().max(80).optional())
    .catch(undefined)
    .transform((v) => v || undefined),
  tab: z.enum(keysOf<CatalogTab>(CATALOG_TABS)).optional().catch(undefined),
  sort: z.enum(keysOf<CatalogSort>(CATALOG_SORTS)).optional().catch(undefined),
  categories: csvList<NftCategory>(NFT_CATEGORIES),
  networks: csvList<Network>(NETWORKS),
  minPrice: ethAmount,
  maxPrice: ethAmount,
  page: z.coerce.number().int().min(2).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Traduz o estado da URL na query enviada para a API. */
export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q,
    tab: search.tab ?? 'all',
    sort: search.sort ?? 'recent',
    categories: search.categories,
    networks: search.networks,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    page: search.page ?? 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

/** Quantos filtros estão aplicados (exibido no botão de filtros do mobile). */
export function countActiveFilters(search: CatalogSearch) {
  return (
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)
  )
}
