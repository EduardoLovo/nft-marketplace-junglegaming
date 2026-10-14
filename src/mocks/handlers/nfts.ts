import { HttpResponse } from 'msw'
import {
  CATALOG_SORTS,
  CATALOG_TABS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  NETWORKS,
  NFT_CATEGORIES,
  REVIEWS_PAGE_SIZE,
  type CatalogPage,
  type CatalogSort,
  type CatalogTab,
  type Network,
  type NftCategory,
  type NftDetail,
  type NftReviewPage,
  type NftSummary,
} from '@/contracts/catalog'
import { compareEth, isEthAmount } from '@/lib/eth'
import { db } from '../db'
import { CATALOG_REFERENCE_DATE, type NftRecord } from '../fixtures/nfts'
import { reviewsFor } from '../fixtures/reviews'
import { apiError, route } from '../http'

const NEW_RELEASE_WINDOW_MS = 4 * 24 * 3_600_000
const TRENDING_THRESHOLD = 70

/** Comparação sem acento e sem caixa ("musica" encontra "Música"). */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function toSummary(record: NftRecord): NftSummary {
  const { id, name, image, category, network, collection, priceEth, status, isRare, listedAt, version } = record
  return { id, name, image, category, network, collection, priceEth, status, isRare, listedAt, version }
}

export function toDetail(record: NftRecord): NftDetail {
  // `trendingScore` é dado interno do servidor e não faz parte do contrato.
  const { trendingScore: _internal, ...detail } = record
  return detail
}

function parseList<T extends string>(value: string | null, allowed: Record<T, string>): T[] | null {
  if (!value) return []
  const items = value.split(',').filter(Boolean)
  return items.every((item) => item in allowed) ? (items as T[]) : null
}

function matchesTab(record: NftRecord, tab: CatalogTab) {
  if (tab === 'new') return Date.parse(record.listedAt) >= CATALOG_REFERENCE_DATE - NEW_RELEASE_WINDOW_MS
  if (tab === 'trending') return record.trendingScore >= TRENDING_THRESHOLD
  return true
}

const sorters: Record<CatalogSort, (a: NftRecord, b: NftRecord) => number> = {
  recent: (a, b) => b.listedAt.localeCompare(a.listedAt),
  'price-asc': (a, b) => compareEth(a.priceEth, b.priceEth) || a.name.localeCompare(b.name),
  'price-desc': (a, b) => compareEth(b.priceEth, a.priceEth) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
}

function countBy<T extends string>(records: NftRecord[], labels: Record<T, string>, pick: (r: NftRecord) => T) {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
    count: records.filter((r) => pick(r) === value).length,
  }))
}

export const nftHandlers = [
  route('get', '/nfts', ({ request }) => {
    const params = new URL(request.url).searchParams

    const tab = (params.get('tab') ?? 'all') as CatalogTab
    const sort = (params.get('sort') ?? 'recent') as CatalogSort
    const categories = parseList<NftCategory>(params.get('categories'), NFT_CATEGORIES)
    const networks = parseList<Network>(params.get('networks'), NETWORKS)
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)

    const fields: Record<string, string> = {}
    if (!(tab in CATALOG_TABS)) fields.tab = 'Aba inválida.'
    if (!(sort in CATALOG_SORTS)) fields.sort = 'Ordenação inválida.'
    if (categories === null) fields.categories = 'Categoria inválida.'
    if (networks === null) fields.networks = 'Rede inválida.'
    if (minPrice && !isEthAmount(minPrice)) fields.minPrice = 'Preço mínimo inválido.'
    if (maxPrice && !isEthAmount(maxPrice)) fields.maxPrice = 'Preço máximo inválido.'
    if (!Number.isInteger(page) || page < 1) fields.page = 'Página inválida.'
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) fields.pageSize = 'Tamanho de página inválido.'
    if (Object.keys(fields).length > 0) {
      return apiError(400, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.', fields)
    }

    const query = normalize(params.get('q')?.trim() ?? '')
    const collection = params.get('collection')
    const exclude = params.get('exclude')

    // Base das contagens dos filtros: busca, aba e coleção, sem os próprios filtros.
    const base = db.state.nfts.filter(
      (r) =>
        matchesTab(r, tab) &&
        (!collection || r.collection.id === collection) &&
        r.id !== exclude &&
        (!query || normalize(`${r.name} ${r.collection.name} ${r.creator.name}`).includes(query)),
    )

    const filtered = base
      .filter(
        (r) =>
          (categories!.length === 0 || categories!.includes(r.category)) &&
          (networks!.length === 0 || networks!.includes(r.network)) &&
          (!minPrice || compareEth(r.priceEth, minPrice) >= 0) &&
          (!maxPrice || compareEth(r.priceEth, maxPrice) <= 0),
      )
      .sort(sorters[sort])

    const prices = db.state.nfts.map((r) => r.priceEth).sort(compareEth)
    const body: CatalogPage = {
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      facets: {
        categories: countBy(base, NFT_CATEGORIES, (r) => r.category),
        networks: countBy(base, NETWORKS, (r) => r.network),
        priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
      },
    }
    return HttpResponse.json(body)
  }),

  route<{ id: string }>('get', '/nfts/:id', ({ params }) => {
    const record = db.state.nfts.find((r) => r.id === params.id)
    if (!record) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json<NftDetail>(toDetail(record))
  }),

  route<{ id: string }>('get', '/nfts/:id/reviews', ({ params, request }) => {
    const record = db.state.nfts.find((r) => r.id === params.id)
    if (!record) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    if (!Number.isInteger(page) || page < 1) {
      return apiError(400, 'VALIDATION_ERROR', 'Página inválida.', { page: 'Página inválida.' })
    }
    // Mais recentes primeiro.
    const reviews = reviewsFor(record).reverse()
    return HttpResponse.json<NftReviewPage>({
      items: reviews.slice((page - 1) * REVIEWS_PAGE_SIZE, page * REVIEWS_PAGE_SIZE),
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      total: reviews.length,
      totalPages: Math.max(1, Math.ceil(reviews.length / REVIEWS_PAGE_SIZE)),
    })
  }),
]
