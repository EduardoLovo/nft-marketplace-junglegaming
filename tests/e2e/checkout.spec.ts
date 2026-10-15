import type { Page } from '@playwright/test'
import { expect, signIn, test } from './fixtures'

/** Prepara a Ana com itens no carrinho e abre o pagamento. */
async function openCheckout(page: Page, mocks: { api: (method: string, path: string, body?: unknown) => Promise<unknown> }) {
  await signIn(page, 'ana', '/')
  await mocks.api('POST', '/cart/items', { editionId: 'violet-nomad-314--open', quantity: 2 })
  await mocks.api('POST', '/cart/items', { editionId: 'golden-beat-207--open', quantity: 1 })
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Seus NFTs' })).toBeVisible()
}

async function connectWallet(page: Page) {
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Aprovar conexão' }).click()
  await expect(page.getByRole('button', { name: 'Desconectar MetaMask' })).toBeVisible()
}

const review = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })

test.describe('Checkout', () => {
  test('compra completa até o recibo e remove só os itens comprados @main', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await connectWallet(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(review(page)).toBeVisible()
    await expect(review(page)).toContainText('Violet Nomad #314')
    await review(page).getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()
    // O status chega pelo evento order.updated.
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Transação confirmada na Ethereum')).toBeVisible()

    const cart = await mocks.api<{ items: unknown[] }>('GET', '/cart')
    expect(cart.body.items).toHaveLength(0)
  })

  test('valida campos e exige carteira conectada', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await page.getByLabel('Nome de exibição').fill('')
    await page.getByLabel('E-mail para o recibo').fill('invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    await page.getByLabel('Nome de exibição').fill('Ana')
    await page.getByLabel('E-mail para o recibo').fill('ana@kurio.dev')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Conecte a carteira para revisar o pedido.')).toBeVisible()

    // Rejeitar na carteira não conecta.
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Rejeitar' }).click()
    await expect(page.getByText('Conexão recusada na carteira')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()

    // Desconectar volta ao estado inicial.
    await connectWallet(page)
    await page.getByRole('button', { name: 'Desconectar MetaMask' }).click()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()
  })

  test('preço muda durante a revisão: bloqueia e pede reconfirmação', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(review(page)).toBeVisible()

    await mocks.updateEdition('violet-nomad-314--open', { priceEth: '1.49' })
    await expect(review(page).getByText('O preço ou o estoque de um item mudou agora.')).toBeVisible()
    await expect(review(page).getByRole('button', { name: /Confirmar/ })).toHaveCount(0)

    await review(page).getByRole('button', { name: 'Atualizar valores' }).click()
    await expect(review(page).getByText('Violet Nomad #314: preço de 1.39 ETH para 1.49 ETH.')).toBeVisible()
    await review(page).getByRole('button', { name: 'Confirmar com novos valores' }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
  })

  test('duplo clique em confirmar cria um único pedido', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page).getByRole('button', { name: 'Confirmar compra' }).dblclick()
    await expect(page).toHaveURL(/\/orders\/ord_/)

    const orders = await mocks.api<unknown[]>('GET', '/orders')
    expect(orders.body).toHaveLength(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await connectWallet(page)
    await mocks.setConfig({ orderTimeoutOnce: true })
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page).getByRole('button', { name: 'Confirmar compra' }).click()

    // O cliente estoura o timeout (3s no build de teste) e repete com a mesma chave.
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 15_000 })
    const orders = await mocks.api<unknown[]>('GET', '/orders')
    expect(orders.body).toHaveLength(1)
  })

  test('pagamento recusado mantém o carrinho', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await mocks.setConfig({ paymentOutcome: 'decline', paymentDelayMs: 1_000 })
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page).getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('A carteira recusou a transação. Seu carrinho foi mantido.')).toBeVisible()
    const cart = await mocks.api<{ items: unknown[] }>('GET', '/cart')
    expect(cart.body.items).toHaveLength(2)
  })

  test('queda de conexão com pedido pendente se recupera sem duplicar', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await mocks.setConfig({ paymentDelayMs: 4_000 })
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page).getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()

    // Refresh e queda do socket enquanto pendente.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()
    await mocks.dropRealtimeConnections()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })

    const orders = await mocks.api<unknown[]>('GET', '/orders')
    expect(orders.body).toHaveLength(1)
  })

  test('pedido de outra conta responde acesso negado', async ({ page, mocks }) => {
    await openCheckout(page, mocks)
    await connectWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page).getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    const orderPath = new URL(page.url()).pathname

    await page.getByRole('button', { name: /^Conta de Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await signIn(page, 'bruno', orderPath)
    await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible()
  })
})
