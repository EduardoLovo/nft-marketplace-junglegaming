import type { Page } from '@playwright/test'
import { expect, test, waitForApp } from './fixtures'

const grid = (page: Page) => page.locator('#mercado ul.grid')
const cardNames = (page: Page) => grid(page).getByRole('heading', { level: 3 })
const results = (page: Page) => page.locator('[aria-live="polite"][aria-atomic="true"]')

/** Preços exibidos nos cards da página atual. */
async function cardPrices(page: Page) {
  const texts = await grid(page).locator('li p.text-primary').allTextContents()
  return texts.map((text) => Number(text.replace(/[^\d.]/g, '').replace(/^\./, '')))
}

test.describe('Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(cardNames(page)).toHaveCount(9)
  })

  test('busca, filtra e ordena com o estado na URL @main', async ({ page, compact }) => {
    // Desktop: busca do header; mobile: campo acima da grade (o outro fica oculto).
    if (!compact) await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    const search = page.getByRole('searchbox', { name: 'Buscar NFTs, coleções ou criadores' }).locator('visible=true')
    await search.fill('golden')
    if (!compact) await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=golden/)
    await expect(cardNames(page).first()).toContainText(/golden/i)

    // No mobile a ordenação fica no painel de filtros.
    if (compact) await page.getByRole('button', { name: /^Filtros/ }).click()
    await page.getByLabel('Ordenar por:').locator('visible=true').selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    if (compact) await page.keyboard.press('Escape')
    await expect
      .poll(async () => {
        const prices = await cardPrices(page)
        return prices.length > 1 && prices.every((price, i) => i === 0 || prices[i - 1] <= price)
      })
      .toBe(true)
  })

  test('combina filtros, volta à página 1 e respeita o histórico', async ({ page }) => {
    await page.getByRole('button', { name: 'Página 2', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)

    // Mudar um filtro volta para a primeira página.
    await page.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/categories=music/)
    await expect(page).not.toHaveURL(/page=/)

    await page.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/categories=music&networks=ethereum|networks=ethereum.*categories=music/)
    await expect(results(page)).toContainText('NFTs encontrados')
    const combined = await cardNames(page).count()

    await page.goBack()
    await expect(page).not.toHaveURL(/networks=/)
    await expect(cardNames(page)).not.toHaveCount(combined)

    await page.goForward()
    await expect(page).toHaveURL(/networks=ethereum/)
    await expect(cardNames(page)).toHaveCount(combined)

    // Refresh mantém o estado.
    await page.reload()
    await waitForApp(page)
    await expect(page.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(cardNames(page)).toHaveCount(combined)
  })

  test('faixa de preço numérica na URL filtra os resultados', async ({ page }) => {
    await page.goto('/?minPrice=3.46')
    await waitForApp(page)
    await expect(page).toHaveURL(/minPrice=3.46/)
    await expect.poll(async () => (await cardPrices(page)).every((price) => price >= 3.46)).toBe(true)
    await expect(page.getByText('Preço: 3,46 - 12,30 ETH')).toBeVisible()
  })

  test('pagina e mostra estado vazio para busca sem resultado', async ({ page }) => {
    await page.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(results(page)).toContainText('Página 2 de 6')

    await page.goto('/?q=nao-existe-nada')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
    await expect(cardNames(page)).toHaveCount(9)
  })

  test('mostra skeletons enquanto carrega', async ({ page, mocks }) => {
    await mocks.setConfig({ latencyMs: 1_500 })
    await page.reload()
    await expect(page.locator('#mercado [aria-busy="true"] [data-slot="skeleton"]').first()).toBeVisible()
    await expect(cardNames(page)).toHaveCount(9)
  })

  test('mostra erro com nova tentativa e se recupera', async ({ page, mocks }) => {
    await mocks.setConfig({
      latencyMs: 60,
      failures: { 'GET /nfts': { kind: 'http', status: 500, code: 'SERVER_ERROR' } },
    })
    await page.reload()
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
    // Erros 5xx são repetidos automaticamente antes de aparecer o erro.
    await expect(alert).toBeVisible({ timeout: 15_000 })

    await mocks.setConfig({ failures: {} })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cardNames(page)).toHaveCount(9)
  })

  test('ignora respostas fora de ordem', async ({ page, mocks }) => {
    await mocks.setConfig({ latencyMs: 60, outOfOrder: true })
    await page.goto('/?q=g')
    await page.goto('/?q=golden')
    await waitForApp(page)
    await expect(page).toHaveURL(/q=golden/)
    await expect(results(page)).toContainText('12 NFTs encontrados', { timeout: 10_000 })
    await expect(cardNames(page).first()).toContainText(/golden/i)
  })
})

test.describe('Detalhe do NFT', () => {
  test('acesso direto, edição na URL e limite de quantidade @main', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042?edition=limited-10')
    await waitForApp(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /^1\/10 / })).toBeChecked()

    // A edição 1/1 está esgotada e não pode ser escolhida.
    await expect(page.getByRole('radio', { name: /^1\/1 \(esgotada\)/ })).toBeDisabled()

    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).locator('visible=true')
    for (let i = 0; i < 6; i++) {
      if (await plus.isEnabled()) await plus.click()
    }
    // Limite por pedido da edição 1/10: 5 unidades.
    await expect(page.locator('output:visible').first()).toHaveText('5')
    await expect(plus).toBeDisabled()
  })

  test('NFT inexistente mostra 404 dedicado', async ({ page }) => {
    await page.goto('/nfts/nao-existe')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
    await expect(page).toHaveURL(/\/#mercado$/)
  })

  test('rota inexistente mostra página 404', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
