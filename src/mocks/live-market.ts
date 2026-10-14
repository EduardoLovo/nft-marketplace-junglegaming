import { addEth, compareEth, subtractEth } from '@/lib/eth'
import { getMockConfig } from './config'
import { db } from './db'
import { updateEdition } from './domain/catalog'

let timer: ReturnType<typeof setInterval> | undefined
let tick = 0

/**
 * "Mercado ao vivo": a cada intervalo, um NFT do catálogo muda. Ciclos
 * alternados sobem/descem o preço de uma edição ou vendem uma unidade, sempre
 * na mesma sequência (determinístico), gerando eventos `nft.updated`.
 */
function step() {
  const nfts = db.state.nfts.filter((nft) => nft.status === 'available')
  if (nfts.length === 0) return
  const nft = nfts[(tick * 7) % nfts.length]
  const edition = nft.editions.find((e) => e.available === null || e.available > 0)
  if (!edition) return

  const move = tick % 3
  if (move === 2 && edition.available !== null) {
    updateEdition(edition.id, { available: edition.available - 1 })
  } else {
    const delta = '0.05'
    const lowered = subtractEth(edition.priceEth, delta)
    const priceEth = move === 0 || compareEth(lowered, '0.01') < 0 ? addEth(edition.priceEth, delta) : lowered
    updateEdition(edition.id, { priceEth })
  }
  tick += 1
}

/** Liga ou desliga o ticker conforme `liveMarketIntervalMs` da configuração. */
export function syncLiveMarket() {
  clearInterval(timer)
  const interval = getMockConfig().liveMarketIntervalMs
  if (interval) timer = setInterval(step, interval)
}
