import type { Page } from '@playwright/test'
import { expect, signIn, test, waitForApp } from './fixtures'

/**
 * Regressão visual das telas exigidas pelo desafio (início, detalhe, carrinho e
 * pagamento), no desktop e no mobile. Os dados são estáveis: o backend simulado
 * começa sempre no cenário padrão e o carrinho é montado igual em todo teste.
 * Baselines em `tests/e2e/visual.spec.ts-snapshots/` (atualizar com
 * `npm run test:visual:update` depois de uma mudança visual intencional).
 */

/** Espera imagens e fontes: sem isso a captura pode sair com artes pela metade. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    // Imagens "lazy" fora da tela nunca carregariam: força o carregamento de todas.
    const wait = (image: HTMLImageElement) =>
      Promise.race([image.decode().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 5_000))])
    await Promise.all(
      [...document.images].map((image) => {
        image.loading = 'eager'
        return image.complete ? undefined : wait(image)
      }),
    )
  })
}

async function snapshot(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    // O indicador de conexão em tempo real depende do momento da captura.
    mask: [page.locator('[data-realtime-indicator]')],
  })
}

/** Ana com dois itens fixos no carrinho (edições e quantidades sempre iguais). */
async function withCart(page: Page, mocks: { api: (method: string, path: string, body?: unknown) => Promise<unknown> }, path: string) {
  await signIn(page, 'ana', '/')
  await mocks.api('POST', '/cart/items', { editionId: 'emerald-ape-042--limited-50', quantity: 2 })
  await mocks.api('POST', '/cart/items', { editionId: 'violet-nomad-314--open', quantity: 1 })
  await page.goto(path)
  await waitForApp(page)
}

test.describe('Regressão visual @visual', () => {
  test('início', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toBeVisible()
    await snapshot(page, 'inicio')
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
    await snapshot(page, 'detalhe')
  })

  test('carrinho', async ({ page, mocks }) => {
    await withCart(page, mocks, '/cart')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText('Violet Nomad #314')
    await expect(page.getByRole('heading', { name: 'Colecionadores também viram' })).toBeVisible()
    await snapshot(page, 'carrinho')
  })

  test('pagamento', async ({ page, mocks }) => {
    await withCart(page, mocks, '/checkout')
    await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeAttached()
    await expect(page.getByText('Rede principal Ethereum').or(page.getByRole('combobox', { name: 'Rede' })).first()).toBeVisible()
    await snapshot(page, 'pagamento')
  })
})
