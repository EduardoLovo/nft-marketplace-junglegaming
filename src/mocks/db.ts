import { createNftFixtures, type NftRecord } from './fixtures/nfts'
import { DEFAULT_SCENARIO, scenarios, type ScenarioId } from './scenarios'
import { setMockConfig, DEFAULT_MOCK_CONFIG } from './config'

/**
 * "Banco de dados" do backend simulado. Mantém catálogo, usuários, carrinhos
 * e pedidos consistentes entre si e persiste no localStorage para que o
 * estado sobreviva a um refresh, como num servidor real.
 */
export interface MockDbState {
  /** Versão do formato. Ao mudar fixtures ou estrutura, incremente para descartar dados antigos. */
  schemaVersion: number
  scenario: ScenarioId
  nfts: NftRecord[]
}

const SCHEMA_VERSION = 1
const STORAGE_KEY = 'kurio:mocks:db'

function createState(scenario: ScenarioId): MockDbState {
  const state: MockDbState = {
    schemaVersion: SCHEMA_VERSION,
    scenario,
    nfts: createNftFixtures(),
  }
  scenarios[scenario].seed?.(state)
  return state
}

function loadState(): MockDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDbState
      if (parsed.schemaVersion === SCHEMA_VERSION && parsed.scenario in scenarios) return parsed
    }
  } catch {
    // Dados corrompidos ou storage indisponível: recomeça do cenário padrão.
  }
  return createState(DEFAULT_SCENARIO)
}

let state = loadState()

export const db = {
  get state(): Readonly<MockDbState> {
    return state
  },

  /**
   * Aplica uma alteração e persiste. Toda escrita deve passar por aqui para
   * não haver mudança em memória que se perca no próximo refresh.
   */
  update(mutate: (draft: MockDbState) => void) {
    mutate(state)
    persist()
  },

  /** Restaura um cenário conhecido: dados e configuração de rede voltam ao estado inicial. */
  reset(scenario: ScenarioId = DEFAULT_SCENARIO) {
    state = createState(scenario)
    setMockConfig({ ...DEFAULT_MOCK_CONFIG, ...scenarios[scenario].config })
    persist()
  },
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sem storage o estado vale só enquanto a aba estiver aberta.
  }
}
