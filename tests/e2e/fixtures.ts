import { test as base, expect, type Page } from '@playwright/test'

/** Usuários de demonstração (mesmas credenciais do README). */
export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.dev', password: 'Colecione#123', name: 'Bruno Lima' },
} as const

export type DemoUser = keyof typeof USERS

/**
 * Latência fixa e baixa: deixa a suíte rápida e determinística. Testes que
 * precisam de outro comportamento ajustam pela fixture `mocks`.
 */
const BASE_MOCK_CONFIG = { latencyMs: 60, offline: false, outOfOrder: false, failures: {} }

type MockConfig = Record<string, unknown>

/** Acesso tipado mínimo a `window.__KURIO_MOCKS__` dentro de `page.evaluate`. */
interface MockControls {
  getConfig: () => MockConfig
  setConfig: (config: MockConfig) => void
  reset: (scenario?: string) => void
  updateEdition: (editionId: string, patch: { priceEth?: string; available?: number | null }) => void
  expireSessions: () => void
  replayLastEvent: (options?: { stale?: boolean }) => unknown
  dropRealtimeConnections: () => void
  activeRealtimeConnections: () => number
}

declare global {
  interface Window {
    __KURIO_MOCKS__?: MockControls
  }
}

/** Espera o MSW e o app estarem prontos (o app só monta depois do worker). */
export async function waitForApp(page: Page) {
  await page.waitForFunction(() => Boolean(window.__KURIO_MOCKS__))
  await page.locator('#conteudo').waitFor()
}

class Mocks {
  constructor(private readonly page: Page) {}

  setConfig(config: MockConfig) {
    return this.page.evaluate((next) => window.__KURIO_MOCKS__!.setConfig(next), config)
  }

  updateEdition(editionId: string, patch: { priceEth?: string; available?: number | null }) {
    return this.page.evaluate(([id, next]) => window.__KURIO_MOCKS__!.updateEdition(id, next), [editionId, patch] as const)
  }

  expireSessions() {
    return this.page.evaluate(() => window.__KURIO_MOCKS__!.expireSessions())
  }

  replayLastEvent(options: { stale?: boolean } = {}) {
    return this.page.evaluate((opts) => window.__KURIO_MOCKS__!.replayLastEvent(opts), options)
  }

  dropRealtimeConnections() {
    return this.page.evaluate(() => window.__KURIO_MOCKS__!.dropRealtimeConnections())
  }

  activeRealtimeConnections() {
    return this.page.evaluate(() => window.__KURIO_MOCKS__!.activeRealtimeConnections())
  }

  /** Faz uma requisição à API simulada a partir da página (mesma sessão/carrinho do app). */
  api<T = unknown>(method: string, path: string, body?: unknown) {
    return this.page.evaluate(
      async ([m, p, b]) => {
        const session = JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { token: string } | null
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session) headers.Authorization = `Bearer ${session.token}`
        const cartId = localStorage.getItem('kurio:cart-id')
        if (cartId) headers['X-Cart-Id'] = cartId
        const response = await fetch(`/api${p}`, { method: m, headers, body: b === undefined ? undefined : JSON.stringify(b) })
        const text = await response.text()
        return { status: response.status, body: (text ? JSON.parse(text) : null) as unknown }
      },
      [method, path, body] as const,
    ) as Promise<{ status: number; body: T }>
  }
}

/**
 * Entra como um usuário de demonstração pela API (mais rápido que o
 * formulário, que tem testes próprios) e abre `path` já autenticado.
 */
export async function signIn(page: Page, user: DemoUser, path = '/') {
  await page.goto('/')
  await waitForApp(page)
  await page.evaluate(async ({ email, password }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cart-Id': localStorage.getItem('kurio:cart-id') ?? 'e2e-guest-cart' },
      body: JSON.stringify({ email, password }),
    })
    const session = (await response.json()) as { token: string; expiresAt: string; user: unknown }
    localStorage.setItem('kurio:session', JSON.stringify(session))
  }, USERS[user])
  await page.goto(path)
  await waitForApp(page)
}

export const test = base.extend<{ mocks: Mocks }>({
  page: async ({ page }, use) => {
    await page.addInitScript((config) => {
      // Só na primeira carga do contexto: testes que mudam a config (ex.: falhas
      // forçadas) mantêm o ajuste após navegar ou recarregar.
      if (!localStorage.getItem('kurio:mocks:config')) {
        localStorage.setItem('kurio:mocks:config', JSON.stringify(config))
      }
    }, BASE_MOCK_CONFIG)

    // Avisos do React (campo controlado/não controlado, keys repetidas, setState
    // durante render...) indicam bug mesmo quando a tela parece certa: o teste falha.
    // Erros de rede esperados (4xx/5xx dos cenários) não entram aqui.
    const reactWarnings: string[] = []
    page.on('console', (message) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return
      const text = message.text()
      if (/A component is changing|Each child in a list|Encountered two children|Cannot update a component|Maximum update depth/i.test(text)) {
        reactWarnings.push(text.slice(0, 200))
      }
    })
    await use(page)
    expect(reactWarnings, 'avisos do React no console').toEqual([])
  },
  mocks: async ({ page }, use) => {
    await use(new Mocks(page))
  },
})

export { expect }
