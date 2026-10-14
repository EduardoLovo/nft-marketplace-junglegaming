import type { MockConfig } from './config'
import type { MockDbState } from './db'

/**
 * Cenários determinísticos do backend simulado. Cada um parte das mesmas
 * fixtures e aplica ajustes de dados (`seed`) e de rede (`config`).
 *
 * Seleção: `?scenario=<id>` na URL, `window.__KURIO_MOCKS__.reset('<id>')`
 * no console ou nos testes. Novos cenários entram aqui conforme os fluxos.
 */
export interface Scenario {
  label: string
  description: string
  config?: Partial<MockConfig>
  seed?: (state: MockDbState) => void
}

const definitions = {
  default: {
    label: 'Padrão',
    description: 'Catálogo completo, latência baixa e nenhuma falha.',
  },
  'empty-catalog': {
    label: 'Catálogo vazio',
    description: 'Nenhum NFT listado, para validar os estados vazios.',
    seed: (state) => {
      state.nfts = []
    },
  },
  'catalog-error': {
    label: 'Erro no catálogo',
    description: 'A listagem de NFTs responde 500 até o cenário ser trocado.',
    config: { failures: { 'GET /nfts': { kind: 'http', status: 500, code: 'SERVER_ERROR' } } },
  },
  'catalog-flaky': {
    label: 'Catálogo instável',
    description: 'A listagem falha com 503 duas vezes e depois responde normalmente (testa o retry).',
    config: {
      failures: { 'GET /nfts': { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', times: 2 } },
    },
  },
  'out-of-order': {
    label: 'Respostas fora de ordem',
    description: 'Buscas alternam entre lentas e rápidas para a resposta antiga chegar por último.',
    config: { outOfOrder: true },
  },
  'slow-network': {
    label: 'Rede lenta',
    description: 'Todas as respostas levam 2,5s, para validar skeletons e estados de carregamento.',
    config: { latencyMs: 2_500 },
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'Os pedidos criados são recusados pela carteira após o processamento.',
    config: { paymentOutcome: 'decline' },
  },
  'order-timeout': {
    label: 'Timeout ao criar pedido',
    description: 'O primeiro pedido é criado mas a resposta não chega; a nova tentativa com a mesma chave recupera o mesmo pedido.',
    config: { orderTimeoutOnce: true },
  },
  'wallet-connect-error': {
    label: 'Falha ao conectar carteira',
    description: 'A conexão com a carteira falha uma vez com 503 e depois funciona.',
    config: {
      failures: {
        'POST /wallets/:id/connect': { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', times: 1 },
      },
    },
  },
  'favorites-error': {
    label: 'Falha ao favoritar',
    description: 'Favoritar e desfavoritar falham uma vez com 503 (testa o rollback do update otimista).',
    config: {
      failures: {
        'PUT /favorites/:nftId': { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', times: 1 },
        'DELETE /favorites/:nftId': { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', times: 1 },
      },
    },
  },
  'live-market': {
    label: 'Mercado ao vivo',
    description: 'A cada 8s um NFT muda de preço ou estoque, gerando eventos nft.updated.',
    config: { liveMarketIntervalMs: 8_000 },
  },
  offline: {
    label: 'Sem conexão',
    description: 'Toda requisição falha com erro de rede.',
    config: { offline: true },
  },
} satisfies Record<string, Scenario>

export type ScenarioId = keyof typeof definitions

export const scenarios: Record<ScenarioId, Scenario> = definitions

export const DEFAULT_SCENARIO: ScenarioId = 'default'

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in scenarios
}
