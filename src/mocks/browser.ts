import { setupWorker } from 'msw/browser'
import { getMockConfig, setMockConfig, type MockConfig } from './config'
import { db } from './db'
import { expireAllSessions } from './domain/auth'
import { updateEdition, type EditionPatch } from './domain/catalog'
import { scheduleSettlement } from './domain/orders'
import { handlers } from './handlers'
import { syncLiveMarket } from './live-market'
import { activeConnections, dropConnections, replayLastEvent } from './realtime'
import { isScenarioId, scenarios, type ScenarioId } from './scenarios'

/**
 * API de controle dos mocks, exposta em `window.__KURIO_MOCKS__` para o
 * console e para os testes (Playwright) ajustarem cenários e falhas.
 */
export interface MockControls {
  scenarios: typeof scenarios
  getConfig: () => MockConfig
  setConfig: (config: Partial<MockConfig>) => void
  reset: (scenario?: ScenarioId) => void
  /** Altera preço/estoque de uma edição (ex.: simular mudança durante a compra). */
  updateEdition: (editionId: string, patch: EditionPatch) => void
  /** Expira todas as sessões ativas (próxima requisição autenticada recebe 401). */
  expireSessions: () => void
  /** Reenvia o último evento em tempo real: igual (duplicado) ou com versão anterior (`stale`). */
  replayLastEvent: (options?: { stale?: boolean }) => unknown
  /** Derruba as conexões Socket.IO (o cliente reconecta e reconcilia com a API). */
  dropRealtimeConnections: () => void
  activeRealtimeConnections: () => number
}

declare global {
  interface Window {
    __KURIO_MOCKS__?: MockControls
  }
}

export const worker = setupWorker(...handlers)

/**
 * `?scenario=<id>` troca o cenário e reinicia os dados antes do primeiro
 * render. O parâmetro é removido da URL para um refresh não resetar de novo.
 */
function applyScenarioFromUrl() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  if (!scenario) return
  if (isScenarioId(scenario)) {
    db.reset(scenario)
  } else {
    console.warn(`[mocks] Cenário desconhecido: "${scenario}".`, Object.keys(scenarios))
  }
  url.searchParams.delete('scenario')
  window.history.replaceState(window.history.state, '', url)
}

export async function startMockWorker() {
  applyScenarioFromUrl()

  window.__KURIO_MOCKS__ = {
    scenarios,
    getConfig: getMockConfig,
    setConfig: (config) => {
      setMockConfig(config)
      syncLiveMarket()
    },
    reset: (scenario) => {
      db.reset(scenario)
      syncLiveMarket()
    },
    updateEdition: (editionId, patch) => {
      updateEdition(editionId, patch)
    },
    expireSessions: expireAllSessions,
    replayLastEvent,
    dropRealtimeConnections: dropConnections,
    activeRealtimeConnections: activeConnections,
  }

  // Timers não sobrevivem ao refresh: reagenda a conclusão dos pedidos pendentes.
  for (const order of db.state.orders) if (order.status === 'pending') scheduleSettlement(order)
  syncLiveMarket()

  await worker.start({
    // Requisições fora da API (assets, fontes) seguem para a rede normalmente.
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
  })
}
