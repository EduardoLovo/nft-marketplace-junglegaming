import type { Page } from '@playwright/test'
import { expect, signIn, test, waitForApp } from './fixtures'

const emeraldPrice = (page: Page) =>
  page.locator('#mercado ul.grid > li').filter({ hasText: 'Emerald Ape #042' }).locator('p.text-primary')

test.describe('Tempo real', () => {
  test('aplica nft.updated e ignora eventos duplicados e antigos', async ({ page, mocks }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect.poll(() => mocks.activeRealtimeConnections()).toBe(1)
    await expect(emeraldPrice(page)).toContainText('1.19 ETH')

    await mocks.updateEdition('emerald-ape-042--open', { priceEth: '1.09' })
    await expect(emeraldPrice(page)).toContainText('1.09 ETH')

    // Duplicado (mesmo id) não muda nada.
    await mocks.replayLastEvent()
    await expect(emeraldPrice(page)).toContainText('1.09 ETH')

    // Evento antigo (versão anterior) não regride o estado.
    await mocks.updateEdition('emerald-ape-042--open', { priceEth: '1.15' })
    await expect(emeraldPrice(page)).toContainText('1.15 ETH')
    await mocks.replayLastEvent({ stale: true })
    await page.waitForTimeout(300)
    await expect(emeraldPrice(page)).toContainText('1.15 ETH')
  })

  test('reconcilia com a API após reconectar', async ({ page, mocks }) => {
    await page.goto('/nfts/emerald-ape-042')
    await waitForApp(page)
    await expect.poll(() => mocks.activeRealtimeConnections()).toBe(1)

    // Mudança acontece com o socket fora do ar: o evento se perde.
    await mocks.dropRealtimeConnections()
    await mocks.updateEdition('emerald-ape-042--open', { priceEth: '2.22' })
    expect(await mocks.activeRealtimeConnections()).toBe(0)

    // Ao reconectar, o app revalida via REST o que está na tela.
    await expect(page.getByText('2.22 ETH').first()).toBeVisible({ timeout: 10_000 })
  })

  test('troca de sessão encerra a conexão anterior', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/')
    await expect.poll(() => mocks.activeRealtimeConnections()).toBe(1)
    await page.getByRole('button', { name: /^Conta de Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()
    // Uma única conexão: a anônima. A da Ana foi fechada.
    await expect.poll(() => mocks.activeRealtimeConnections()).toBe(1)
  })
})

test.describe('Acessibilidade e teclado', () => {
  test('link para pular ao conteúdo e filtros pelo teclado', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    const music = page.getByRole('button', { name: /^Música/ })
    await music.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/categories=music/)
    await expect(music).toHaveAttribute('aria-pressed', 'true')
  })

  test('diálogo prende o foco e fecha com Esc devolvendo o foco', async ({ page }) => {
    await signIn(page, 'ana', '/wallets')
    const trigger = page.getByRole('button', { name: 'Adicionar', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Adicionar carteira' })
    await expect(dialog).toBeVisible()

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('slider de preço operável pelo teclado', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    const max = page.getByRole('slider', { name: 'Preço máximo' })
    await max.focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('PageDown')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page).toHaveURL(/maxPrice=11\.80/)
  })

  test('sem rolagem horizontal nas larguras exigidas @main', async ({ page }) => {
    for (const path of ['/', '/nfts/emerald-ape-042', '/cart', '/login']) {
      await page.goto(path)
      await waitForApp(page)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0)
    }
  })
})
