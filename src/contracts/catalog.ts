import type { EthAmount } from '@/lib/eth'
import type { Facet, IsoDateTime, Paginated } from './common'

export const NFT_CATEGORIES = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
} as const satisfies Record<string, string>

export type NftCategory = keyof typeof NFT_CATEGORIES

export const NETWORKS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
} as const satisfies Record<string, string>

export type Network = keyof typeof NETWORKS

export const CATALOG_TABS = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
} as const satisfies Record<string, string>

export type CatalogTab = keyof typeof CATALOG_TABS

export const CATALOG_SORTS = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A-Z)',
} as const satisfies Record<string, string>

export type CatalogSort = keyof typeof CATALOG_SORTS

export interface NftImage {
  src: string
  /** Pronto para o atributo `srcset` (larguras em `w`). */
  srcSet: string
  width: number
  height: number
  alt: string
}

/** Tiragens do layout: 1/1, 1/10, 1/50 e edição aberta. */
export type EditionKind = 'unique' | 'limited-10' | 'limited-50' | 'open'

export interface NftEdition {
  id: string
  kind: EditionKind
  /** Rótulo exibido no seletor, ex.: `"1/10"` ou `"Aberta"`. */
  label: string
  priceEth: EthAmount
  /** Tiragem total; `null` em edições abertas. */
  supply: number | null
  /** Unidades ainda à venda; `null` em edições abertas (sem limite). */
  available: number | null
  /** Limite de unidades por pedido. */
  maxPerOrder: number
}

export type NftStatus = 'available' | 'sold-out'

/** Dados do NFT usados em listagens (cards). */
export interface NftSummary {
  id: string
  name: string
  image: NftImage
  category: NftCategory
  network: Network
  collection: { id: string; name: string }
  /** Menor preço entre as edições disponíveis ("a partir de"). */
  priceEth: EthAmount
  status: NftStatus
  isRare: boolean
  listedAt: IsoDateTime
  /** Incrementa a cada mudança de preço ou estoque (usado nos eventos). */
  version: number
}

export interface NftDetail extends NftSummary {
  description: string
  story: string
  tokenId: string
  creator: { id: string; name: string }
  attributes: string[]
  contract: { address: string; standard: 'ERC-721' | 'ERC-1155' }
  royaltyPercent: number
  rating: { average: number; count: number }
  editions: NftEdition[]
  updatedAt: IsoDateTime
}

/** Parâmetros de `GET /nfts`. Todos opcionais. */
export interface CatalogQuery {
  q?: string
  tab?: CatalogTab
  sort?: CatalogSort
  categories?: NftCategory[]
  networks?: Network[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  collection?: string
  /** Exclui um NFT do resultado (ex.: "Mais desta coleção"). */
  exclude?: string
  page?: number
  pageSize?: number
}

export interface CatalogPage extends Paginated<NftSummary> {
  facets: {
    categories: Facet<NftCategory>[]
    networks: Facet<Network>[]
    priceRange: { min: EthAmount; max: EthAmount }
  }
}

export const DEFAULT_PAGE_SIZE = 9
export const MAX_PAGE_SIZE = 48
