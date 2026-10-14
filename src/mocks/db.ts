import type { SessionRecord } from './domain/auth'
import type { CartRecord } from './domain/cart'
import type { IdempotencyRecord, OrderRecord, QuoteRecord } from './domain/orders'
import { createNftFixtures, type NftRecord } from './fixtures/nfts'
import { USER_FIXTURES, type UserRecord } from './fixtures/users'
import { WALLET_FIXTURES, type WalletRecord } from './fixtures/wallets'
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
  users: UserRecord[]
  /** Sessões ativas por token. */
  sessions: Record<string, SessionRecord>
  /** Carrinhos por id: `user:<id>` para usuários, id gerado no navegador para visitantes. */
  carts: Record<string, CartRecord>
  wallets: WalletRecord[]
  quotes: Record<string, QuoteRecord>
  orders: OrderRecord[]
  /** Chaves de idempotência já usadas em `POST /orders`. */
  idempotency: Record<string, IdempotencyRecord>
  /** NFTs favoritados por usuário, na ordem em que foram adicionados. */
  favorites: Record<string, string[]>
}

const SCHEMA_VERSION = 7
const STORAGE_KEY = 'kurio:mocks:db'

function createState(scenario: ScenarioId): MockDbState {
  const state: MockDbState = {
    schemaVersion: SCHEMA_VERSION,
    scenario,
    nfts: createNftFixtures(),
    users: structuredClone(USER_FIXTURES),
    sessions: {},
    carts: {},
    wallets: structuredClone(WALLET_FIXTURES),
    quotes: {},
    orders: [],
    idempotency: {},
    favorites: { usr_ana: ['ivory-baron-088', 'golden-beat-207'] },
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
