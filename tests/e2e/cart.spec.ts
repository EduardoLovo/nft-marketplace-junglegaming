import type { Page } from '@playwright/test'
import { expect, signIn, test, USERS, waitForApp, waitForRealtime } from './fixtures'

const cartItems = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' })
const summaryValue = (page: Page, label: RegExp) =>
  page.locator('aside dl > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd')

test.describe('Carrinho', () => {
  test('adiciona pelo detalhe, altera quantidade e remove @main', async ({ page }) => {
    await page.goto('/nfts/violet-nomad-314')
    await waitForApp(page)
    await page.getByRole('button', { name: 'Aumentar quantidade' }).locator('visible=true').click()
    await page.getByRole('button', { name: /^Comprar/ }).locator('visible=true').click()

    await expect(page).toHaveURL('/cart')
    await expect(cartItems(page)).toContainText('Violet Nomad #314')
    await expect(summaryValue(page, /^Subtotal$/)).toHaveText('2.78 ETH')

    await page.getByRole('button', { name: 'Aumentar quantidade' }).locator('visible=true').click()
    await expect(summaryValue(page, /^Subtotal$/)).toHaveText('4.17 ETH')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).locator('visible=true').click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('aplica, recusa e remove cupons', async ({ page, mocks }) => {
    await page.goto('/')
    await waitForApp(page)
    await mocks.api('POST', '/cart/items', { editionId: 'ivory-baron-088--open', quantity: 1 })
    await page.goto('/cart')
    const code = page.getByLabel('Código promocional')

    await code.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom inválido.')).toBeVisible()
    await expect(code).toHaveAttribute('aria-invalid', 'true')

    await code.fill('verao2025')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()

    await code.fill('GENESIS15')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Válido para pedidos a partir de 3.00 ETH.')).toBeVisible()

    await code.fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(summaryValue(page, /Desconto/)).toHaveText('(-) 0.179 ETH')
    await expect(summaryValue(page, /^Total$/)).toHaveText('1.6152 ETH')

    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(summaryValue(page, /Desconto/)).toHaveText('(-) 0.00 ETH')
  })

  test('persiste após refresh e leva o carrinho do visitante para a conta', async ({ page, mocks }) => {
    await page.goto('/')
    await waitForApp(page)
    await mocks.api('POST', '/cart/items', { editionId: 'golden-beat-207--open', quantity: 2 })
    await page.goto('/cart')
    await expect(cartItems(page)).toContainText('Golden Beat #207')
    await page.reload()
    await waitForApp(page)
    await expect(cartItems(page)).toContainText('Golden Beat #207')

    // Link direto antigo do login: vira o modal e retoma o carrinho.
    await page.goto('/login?redirect=%2Fcart')
    await expect(page).toHaveURL('/?auth=login&next=%2Fcart')
    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/cart')
    await expect(cartItems(page)).toContainText('Golden Beat #207')
  })

  test('recusa quantidade acima do estoque e avisa mudanças de preço', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/')
    const tooMany = await mocks.api('POST', '/cart/items', { editionId: 'emerald-ape-042--limited-10', quantity: 9 })
    expect(tooMany.status).toBe(409)

    await mocks.api('POST', '/cart/items', { editionId: 'emerald-ape-042--limited-10', quantity: 3 })
    await page.goto('/cart')
    await expect(cartItems(page)).toContainText('Emerald Ape #042')

    // Preço sobe e o estoque cai enquanto o item está no carrinho (evento em tempo real).
    await waitForRealtime(page)
    await mocks.updateEdition('emerald-ape-042--limited-10', { priceEth: '1.99', available: 1 })
    await expect(page.getByText('Emerald Ape #042 mudou no seu carrinho')).toBeVisible()
    await expect(page.getByText('Só resta 1 disponível.').locator('visible=true')).toBeVisible()
    // Com login o botão do resumo é só "Finalizar".
    await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeDisabled()

    await page.getByRole('button', { name: 'Ajustar para 1' }).locator('visible=true').click()
    await page.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(page.getByRole('link', { name: 'Finalizar', exact: true })).toBeVisible()
    await expect(summaryValue(page, /^Subtotal$/)).toHaveText('1.99 ETH')
  })

  test('desfaz a alteração otimista quando a API falha', async ({ page, mocks }) => {
    await page.goto('/')
    await waitForApp(page)
    await mocks.api('POST', '/cart/items', { editionId: 'golden-beat-207--open', quantity: 1 })
    await page.goto('/cart')
    await waitForApp(page)
    // Latência alta para o estado otimista ficar observável antes do rollback.
    await mocks.setConfig({
      latencyMs: 1_500,
      failures: { 'PATCH /cart/items/:editionId': { kind: 'http', status: 500, code: 'SERVER_ERROR', times: 1 } },
    })

    const quantity = page.locator('output:visible').first()
    await page.getByRole('button', { name: 'Aumentar quantidade' }).locator('visible=true').click()
    await expect(quantity).toHaveText('2')
    await expect(page.getByText('Não foi possível alterar a quantidade')).toBeVisible()
    await expect(quantity).toHaveText('1')
  })
})
