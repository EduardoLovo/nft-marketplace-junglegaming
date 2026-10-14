import {
  NFT_CATEGORIES,
  NETWORKS,
  type EditionKind,
  type Network,
  type NftCategory,
  type NftDetail,
  type NftEdition,
} from '@/contracts/catalog'
import { addEth, compareEth, type EthAmount } from '@/lib/eth'

/**
 * Catálogo determinístico: a mesma seed gera sempre os mesmos NFTs, então
 * filtros, paginação e regressão visual têm dados estáveis.
 */

/** Gerador pseudoaleatório Mulberry32 (rápido e com seed). */
function createRandom(seed: number) {
  let state = seed
  const next = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  }
}

type Artwork = 'ape-violet' | 'ape-emerald' | 'ape-golden' | 'ape-ivory'
const ARTWORKS: Artwork[] = ['ape-violet', 'ape-emerald', 'ape-golden', 'ape-ivory']
const ARTWORK_BY_KEYWORD: Record<string, Artwork> = {
  violet: 'ape-violet',
  emerald: 'ape-emerald',
  golden: 'ape-golden',
  ivory: 'ape-ivory',
}
const IMAGE_WIDTHS = [320, 640, 960]

function imageFor(name: string, index: number, fixed?: Artwork) {
  const keyword = name.split(' ')[0].toLowerCase()
  const artwork = fixed ?? ARTWORK_BY_KEYWORD[keyword] ?? ARTWORKS[index % ARTWORKS.length]
  return {
    src: `/images/nfts/${artwork}-640.webp`,
    srcSet: IMAGE_WIDTHS.map((w) => `/images/nfts/${artwork}-${w}.webp ${w}w`).join(', '),
    width: 960,
    height: 960,
    alt: `Arte do NFT ${name}`,
  }
}

const COLLECTIONS = [
  { id: 'kurio-apes', name: 'Kurio Apes' },
  { id: 'kurio-editions', name: 'Kurio Editions' },
  { id: 'neon-vessels', name: 'Neon Vessels' },
  { id: 'golden-frequencies', name: 'Golden Frequencies' },
  { id: 'sage-nomads', name: 'Sage Nomads' },
  { id: 'cosmic-blooms', name: 'Cosmic Blooms' },
] as const

const CREATORS = [
  { id: 'nova-sato', name: 'Nova Sato' },
  { id: 'lia-okafor', name: 'Lia Okafor' },
  { id: 'theo-marin', name: 'Theo Marin' },
  { id: 'iris-vale', name: 'Iris Vale' },
  { id: 'kai-mendes', name: 'Kai Mendes' },
] as const

const ATTRIBUTES = [
  'Óculos', 'Esmeralda', 'Raro', 'Fones', 'Dourado', 'Jaqueta', 'Capuz', 'Brinco',
  'Neon', 'Holográfico', 'Animado', 'Edição de lançamento',
]

/** NFTs que aparecem no Figma, com os mesmos nomes e preços. */
const FIGMA_NFTS: Array<{ name: string; price: EthAmount; collection: string; artwork: Artwork }> = [
  { name: 'Emerald Ape #042', price: '1.19', collection: 'kurio-apes', artwork: 'ape-emerald' },
  { name: 'Cosmic Bloom #118', price: '1.29', collection: 'cosmic-blooms', artwork: 'ape-violet' },
  { name: 'Violet Nomad #314', price: '1.39', collection: 'sage-nomads', artwork: 'ape-violet' },
  { name: 'Ivory Baron #088', price: '1.79', collection: 'kurio-apes', artwork: 'ape-ivory' },
  { name: 'Golden Beat #207', price: '0.99', collection: 'golden-frequencies', artwork: 'ape-golden' },
  { name: 'Golden Signal #160', price: '0.39', collection: 'golden-frequencies', artwork: 'ape-golden' },
  { name: 'Sage Nomad #009', price: '2.29', collection: 'sage-nomads', artwork: 'ape-violet' },
  { name: 'Neon Vessel #552', price: '1.99', collection: 'neon-vessels', artwork: 'ape-ivory' },
  { name: 'Golden Frequency #071', price: '1.69', collection: 'golden-frequencies', artwork: 'ape-golden' },
  { name: 'Emerald Drift #233', price: '0.02', collection: 'kurio-editions', artwork: 'ape-emerald' },
  { name: 'Ivory Crown #001', price: '12.3', collection: 'kurio-editions', artwork: 'ape-ivory' },
  { name: 'Violet Echo #417', price: '0.59', collection: 'cosmic-blooms', artwork: 'ape-violet' },
  { name: 'Golden Relic #095', price: '3.49', collection: 'kurio-apes', artwork: 'ape-golden' },
]

const NAME_PREFIXES = ['Emerald', 'Violet', 'Golden', 'Ivory', 'Neon', 'Cosmic', 'Sage', 'Amber', 'Copper', 'Velvet']
const NAME_SUFFIXES = ['Ape', 'Nomad', 'Signal', 'Baron', 'Vessel', 'Bloom', 'Pulse', 'Oracle', 'Drifter', 'Monarch']

/** Acréscimo sobre o preço-base por tiragem: quanto mais escassa, mais cara. */
const EDITION_PREMIUM: Record<EditionKind, EthAmount> = {
  open: '0',
  'limited-50': '0.2',
  'limited-10': '0.6',
  unique: '2',
}
const EDITION_LABEL: Record<EditionKind, string> = {
  unique: '1/1',
  'limited-10': '1/10',
  'limited-50': '1/50',
  open: 'Aberta',
}
const EDITION_SUPPLY: Record<EditionKind, number | null> = {
  unique: 1,
  'limited-10': 10,
  'limited-50': 50,
  open: null,
}
const EDITION_SETS: EditionKind[][] = [
  ['unique', 'limited-10', 'limited-50', 'open'],
  ['limited-10', 'limited-50', 'open'],
  ['unique'],
  ['limited-50', 'open'],
  ['unique', 'limited-10'],
]

function buildEditions(
  nftId: string,
  basePrice: EthAmount,
  kinds: EditionKind[],
  random: ReturnType<typeof createRandom>,
  soldOut: boolean,
): NftEdition[] {
  return kinds.map((kind) => {
    const supply = EDITION_SUPPLY[kind]
    const available = soldOut ? 0 : supply === null ? null : random.int(0, supply)
    return {
      id: `${nftId}--${kind}`,
      kind,
      label: EDITION_LABEL[kind],
      priceEth: addEth(basePrice, EDITION_PREMIUM[kind]),
      supply,
      available,
      maxPerOrder: supply === null ? 10 : Math.max(1, Math.min(supply, 5)),
    }
  })
}

/** Menor preço entre as edições com estoque; sem estoque, o menor preço geral. */
export function lowestAvailablePrice(editions: NftEdition[]): EthAmount {
  const inStock = editions.filter((e) => e.available === null || e.available > 0)
  const pool = inStock.length > 0 ? inStock : editions
  return pool.map((e) => e.priceEth).sort(compareEth)[0]
}

export function isSoldOut(editions: NftEdition[]): boolean {
  return editions.every((e) => e.available === 0)
}

const slugify = (value: string) =>
  value.toLowerCase().replace(/#/g, '').trim().replace(/[^a-z0-9]+/g, '-')

/** Data mais recente do catálogo; "Novos lançamentos" é relativo a ela. */
export const CATALOG_REFERENCE_DATE = Date.parse('2026-10-10T15:00:00.000Z')

/** Registro interno do mock: o contrato público mais dados só do servidor. */
export interface NftRecord extends NftDetail {
  trendingScore: number
}

export function createNftFixtures(total = 54, seed = 42): NftRecord[] {
  const random = createRandom(seed)
  const categories = Object.keys(NFT_CATEGORIES) as NftCategory[]
  const networks = Object.keys(NETWORKS) as Network[]
  const usedNames = new Set(FIGMA_NFTS.map((n) => n.name))
  const records: NftRecord[] = []

  for (let index = 0; index < total; index++) {
    const figma = FIGMA_NFTS[index]
    let name = figma?.name
    while (!name || (!figma && usedNames.has(name))) {
      name = `${random.pick(NAME_PREFIXES)} ${random.pick(NAME_SUFFIXES)} #${String(random.int(1, 999)).padStart(3, '0')}`
    }
    usedNames.add(name)

    const id = slugify(name)
    const collection =
      COLLECTIONS.find((c) => c.id === figma?.collection) ?? random.pick(COLLECTIONS)
    const creator = index === 0 ? CREATORS[0] : random.pick(CREATORS)
    const basePrice = figma?.price ?? `${random.int(0, 4)}.${String(random.int(1, 99)).padStart(2, '0')}`
    // O 1º NFT (o do detalhe no Figma) tem as 4 edições. Os demais do Figma
    // sempre incluem a edição aberta, cujo preço é o exibido no card do layout.
    const editionKinds =
      index === 0
        ? EDITION_SETS[0]
        : figma
          ? random.pick(EDITION_SETS.filter((set) => set.includes('open')))
          : random.pick(EDITION_SETS)
    const soldOut = index !== 0 && index % 11 === 5
    const editions = buildEditions(id, basePrice, editionKinds, random, soldOut)
    if (index === 0) {
      // Garante estoque no NFT principal do layout, exceto a 1/1, que demonstra
      // uma edição indisponível.
      for (const edition of editions) {
        edition.available = edition.kind === 'unique' ? 0 : edition.supply === null ? null : edition.supply - 3
      }
    }
    const listedAt = new Date(CATALOG_REFERENCE_DATE - index * 7 * 3_600_000).toISOString()
    const attributes = Array.from(new Set([random.pick(ATTRIBUTES), random.pick(ATTRIBUTES), random.pick(ATTRIBUTES)]))
    const tokenNumber = name.split('#')[1] ?? String(index)

    records.push({
      id,
      name,
      image: imageFor(name, index, figma?.artwork),
      category: index === 0 ? 'digital-art' : random.pick(categories),
      network: index === 0 ? 'ethereum' : random.pick(networks),
      collection,
      priceEth: lowestAvailablePrice(editions),
      status: isSoldOut(editions) ? 'sold-out' : 'available',
      isRare: editionKinds.includes('unique'),
      listedAt,
      version: 1,
      description: `Um colecionável digital finalizado à mão da coleção ${collection.name}, verificado na rede, com arte desbloqueável e acesso para colecionadores.`,
      story: `${name} é uma obra digital da coleção ${collection.name}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.\n\nA propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. ${creator.name} recebe 5% de direitos autorais nas vendas secundárias.`,
      tokenId: `#${tokenNumber.padStart(4, '0')}`,
      creator,
      attributes,
      contract: {
        address: `0x${(0x7a42_0000 + index * 7919).toString(16).toUpperCase()}...${(0x19e8 + index).toString(16).toUpperCase()}`,
        standard: editionKinds.length > 1 ? 'ERC-1155' : 'ERC-721',
      },
      royaltyPercent: 5,
      rating: { average: index === 0 ? 4.5 : random.int(30, 50) / 10, count: index === 0 ? 19 : random.int(0, 40) },
      editions,
      updatedAt: listedAt,
      trendingScore: random.int(0, 100),
    })
  }
  return records
}
