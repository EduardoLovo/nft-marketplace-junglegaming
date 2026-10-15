import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const isCI = Boolean(process.env.CI)

/**
 * Os testes rodam contra o build de produção (modo `e2e`) servido pelo
 * `vite preview`, com o MSW ativo como na demonstração. Cada teste abre um
 * contexto novo do navegador: storage vazio, então o backend simulado começa
 * sempre no cenário padrão.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 7_000,
    // Regressão visual: tolera só diferenças mínimas de antialiasing entre máquinas.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  // Baselines sem o sistema operacional no nome: as fontes são do próprio projeto
  // (@fontsource), então as capturas são as mesmas no Windows e no Linux do CI.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Tablet (768px, largura exigida pelo desafio): layout mobile com tela maior.
      name: 'tablet',
      grep: /@main/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      // No mobile rodam os fluxos principais (@main) e a regressão visual (@visual).
      name: 'mobile',
      grep: /@main|@visual/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
