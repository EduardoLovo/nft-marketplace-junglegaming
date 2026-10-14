import type { EditionKind, NftDetail, NftEdition } from '@/contracts/catalog'
import { compareEth } from '@/lib/eth'

export function isEditionAvailable(edition: NftEdition) {
  return edition.available === null || edition.available > 0
}

/** Máximo que pode ser comprado de uma vez: limite por pedido ou estoque, o que for menor. */
export function maxQuantity(edition: NftEdition) {
  if (!isEditionAvailable(edition)) return 0
  return edition.available === null ? edition.maxPerOrder : Math.min(edition.maxPerOrder, edition.available)
}

/**
 * Edição exibida ao abrir o NFT: a mais barata com estoque, que é o preço
 * mostrado no card ("a partir de"). Sem estoque, a primeira da lista.
 */
export function defaultEdition(nft: NftDetail): NftEdition {
  const available = nft.editions.filter(isEditionAvailable)
  if (available.length === 0) return nft.editions[0]
  return [...available].sort((a, b) => compareEth(a.priceEth, b.priceEth))[0]
}

/**
 * Edição pedida na URL, se existir e tiver estoque. Um link antigo para uma
 * edição que esgotou cai na edição padrão em vez de exibir algo invendável.
 */
export function resolveEdition(nft: NftDetail, kind: EditionKind | undefined): NftEdition {
  const requested = nft.editions.find((edition) => edition.kind === kind)
  return requested && isEditionAvailable(requested) ? requested : defaultEdition(nft)
}

/** Texto de estoque exibido abaixo da quantidade. */
export function stockLabel(edition: NftEdition) {
  if (!isEditionAvailable(edition)) return 'Edição esgotada'
  const limit = `máx. ${edition.maxPerOrder} por pedido`
  if (edition.available === null) return `Edição aberta · ${limit}`
  return `${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'} · ${limit}`
}

export const EDITION_KINDS: EditionKind[] = ['unique', 'limited-10', 'limited-50', 'open']
