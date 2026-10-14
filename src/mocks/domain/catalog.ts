import type { EthAmount } from '@/lib/eth'
import { db } from '../db'
import { isSoldOut, lowestAvailablePrice, type NftRecord } from '../fixtures/nfts'
import { publishNftUpdated } from '../realtime'

export interface EditionPatch {
  priceEth?: EthAmount
  /** `null` mantém a edição aberta (sem limite de estoque). */
  available?: number | null
}

/**
 * Altera preço ou estoque de uma edição e recalcula os campos derivados do
 * NFT (preço "a partir de", status e versão), e publica `nft.updated`.
 * Usado por cenários, controles de teste e pelo mercado ao vivo.
 */
export function updateEdition(editionId: string, patch: EditionPatch): NftRecord | null {
  let updated: NftRecord | null = null
  db.update((state) => {
    const nft = state.nfts.find((n) => n.editions.some((e) => e.id === editionId))
    const edition = nft?.editions.find((e) => e.id === editionId)
    if (!nft || !edition) return
    if (patch.priceEth !== undefined) edition.priceEth = patch.priceEth
    if (patch.available !== undefined) edition.available = patch.available
    nft.priceEth = lowestAvailablePrice(nft.editions)
    nft.status = isSoldOut(nft.editions) ? 'sold-out' : 'available'
    nft.version += 1
    nft.updatedAt = new Date().toISOString()
    updated = nft
  })
  if (updated) publishNftUpdated(updated)
  return updated
}
