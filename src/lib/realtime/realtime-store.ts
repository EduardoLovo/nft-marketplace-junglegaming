import { useSyncExternalStore } from 'react'
import type { NftUpdatedEvent } from '@/contracts/realtime'
import type { RealtimeStatus } from './socket-client'

/**
 * Estado observável do tempo real: status da conexão (para o indicador na
 * tela) e um canal de "NFT mudou" para telas que precisam reagir além do
 * cache, como o checkout invalidando a cotação em revisão.
 */
let status: RealtimeStatus = 'connecting'
const statusListeners = new Set<() => void>()
const nftListeners = new Set<(event: NftUpdatedEvent) => void>()

export const realtimeStore = {
  setStatus(next: RealtimeStatus) {
    if (next === status) return
    status = next
    for (const listener of statusListeners) listener()
  },
  getStatus: () => status,
  subscribeStatus(listener: () => void) {
    statusListeners.add(listener)
    return () => {
      statusListeners.delete(listener)
    }
  },
  emitNftUpdated(event: NftUpdatedEvent) {
    for (const listener of nftListeners) listener(event)
  },
  /** Assina mudanças de NFT; devolve a função que cancela (liberar ao desmontar). */
  onNftUpdated(listener: (event: NftUpdatedEvent) => void) {
    nftListeners.add(listener)
    return () => {
      nftListeners.delete(listener)
    }
  },
}

export function useRealtimeStatus() {
  return useSyncExternalStore(realtimeStore.subscribeStatus, realtimeStore.getStatus, realtimeStore.getStatus)
}
