import type { ApiErrorCode } from '@/lib/api/errors'

/**
 * Identifica uma rota simulada no formato `MÉTODO /caminho`, com o padrão
 * declarado no handler (ex.: `GET /nfts/:id`).
 */
export type RouteKey = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /${string}`

/** Falha forçada numa rota. */
export interface FailureRule {
  /** `timeout` segura a resposta até o cliente desistir; `network` derruba a conexão. */
  kind: 'http' | 'timeout' | 'network'
  status?: number
  code?: ApiErrorCode
  message?: string
  /** Quantas requisições falham antes de a rota voltar ao normal. Sem valor: sempre. */
  times?: number
}

export interface MockConfig {
  /** Latência fixa de cada resposta, em ms. Fixa para manter os testes reproduzíveis. */
  latencyMs: number
  /** Simula o navegador sem conexão: toda requisição falha com erro de rede. */
  offline: boolean
  /**
   * Alterna respostas lentas e rápidas em `GET /nfts` para que a resposta de
   * uma busca antiga chegue depois da mais recente.
   */
  outOfOrder: boolean
  failures: Partial<Record<RouteKey, FailureRule>>
  /** Duração das sessões criadas a partir de agora, em ms. */
  sessionTtlMs: number
  /** Resultado do pagamento dos próximos pedidos. */
  paymentOutcome: 'approve' | 'decline'
  /** Tempo até o pagamento ser processado, em ms. */
  paymentDelayMs: number
  /**
   * O próximo `POST /orders` cria o pedido mas não responde (a resposta
   * "se perde"). Testa a recuperação idempotente após timeout.
   */
  orderTimeoutOnce: boolean
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  latencyMs: 350,
  offline: false,
  outOfOrder: false,
  failures: {},
  sessionTtlMs: 30 * 60_000,
  paymentOutcome: 'approve',
  paymentDelayMs: 3_000,
  orderTimeoutOnce: false,
}

const STORAGE_KEY = 'kurio:mocks:config'

function readStoredConfig(): MockConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_MOCK_CONFIG, ...(JSON.parse(raw) as Partial<MockConfig>) } : DEFAULT_MOCK_CONFIG
  } catch {
    return DEFAULT_MOCK_CONFIG
  }
}

let config: MockConfig = readStoredConfig()

/** Requisições já falhadas por rota, para regras com `times`. Vive só na memória. */
const failureCounts = new Map<RouteKey, number>()

export function getMockConfig(): MockConfig {
  return config
}

/** Atualiza e persiste a configuração, para sobreviver a um refresh. */
export function setMockConfig(next: Partial<MockConfig>) {
  config = { ...config, ...next }
  failureCounts.clear()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Sem storage (ex.: modo privado restrito) a configuração vale só nesta aba.
  }
}

/** Devolve a regra de falha ativa para a rota e contabiliza o uso. */
export function consumeFailure(route: RouteKey): FailureRule | null {
  const rule = config.failures[route]
  if (!rule) return null
  const used = failureCounts.get(route) ?? 0
  if (rule.times !== undefined && used >= rule.times) return null
  failureCounts.set(route, used + 1)
  return rule
}
