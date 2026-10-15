import { expect, signIn, test, USERS, waitForApp } from './fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro valida campos, trata conflito e entra na conta @main', async ({ page }) => {
    // Link direto antigo: abre o modal de cadastro sobre a home.
    await page.goto('/signup')
    await waitForApp(page)
    await expect(page).toHaveURL('/?auth=signup')
    await expect(page.getByRole('dialog', { name: 'Criar conta na Kurio' })).toBeVisible()

    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page.getByText('Use ao menos 3 caracteres.')).toBeVisible()
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('Carla Dias')
    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('Segura123')
    await page.getByLabel('Confirmar senha').fill('Outra123')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByLabel('Confirmar senha').fill('Segura123')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    // Conflito vindo da API aparece no próprio campo.
    await expect(page.getByText('Este e-mail já está cadastrado. Entre ou use outro e-mail.')).toBeVisible()
    await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()

    await page.getByLabel('E-mail', { exact: true }).fill('carla@kurio.dev')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Conta criada. Boas-vindas, Carla Dias!')).toBeVisible()
  })

  test('login recusa credencial errada e retorna ao fluxo anterior @main', async ({ page }) => {
    await page.goto('/checkout')
    await waitForApp(page)
    // Rota protegida: abre o modal de login guardando o destino.
    await expect(page).toHaveURL('/?auth=login&next=%2Fcheckout')
    await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()

    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada1')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos.' })).toBeVisible()

    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/checkout')
  })

  test('finalizar como visitante abre o login sobre o carrinho @main', async ({ page, mocks }) => {
    await page.goto('/')
    await waitForApp(page)
    await mocks.api('POST', '/cart/items', { editionId: 'golden-beat-207--open', quantity: 1 })
    await page.goto('/cart')
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    // O carrinho continua ao fundo; depois do login segue para o checkout.
    await expect(page).toHaveURL('/cart?auth=login&next=%2Fcheckout')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText('Golden Beat #207')

    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/checkout')
  })

  test('fechar o modal mantém a página e devolve o foco', async ({ page }) => {
    await page.goto('/cart')
    await waitForApp(page)
    const entrar = page.getByRole('link', { name: 'Entrar' }).locator('visible=true')
    await entrar.click()
    await expect(page.getByRole('dialog', { name: 'Entrar na Kurio' })).toBeVisible()
    await page.getByRole('tab', { name: 'Criar conta' }).click()
    await expect(page.getByRole('dialog', { name: 'Criar conta na Kurio' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/cart')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(entrar).toBeFocused()
  })

  test('sessão sobrevive ao refresh e logout limpa os dados privados', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/cart')
    await mocks.api('POST', '/cart/items', { editionId: 'golden-beat-207--open', quantity: 1 })
    await page.reload()
    await waitForApp(page)
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText('Golden Beat #207')

    await page.getByRole('button', { name: /^Conta de Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    // O carrinho exibido agora é o de visitante, sem os itens da Ana.
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('sessão expirada leva ao login e retoma a página', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/profile?tab=dados')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    await mocks.expireSessions()
    // Ao abrir outra página, a validação da sessão recebe 401 e leva ao login.
    await page.goto('/wallets')
    await expect(page).toHaveURL('/?auth=login&next=%2Fwallets&reason=expired')
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()

    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/wallets')
  })

  test('sessão expira pelo relógio mesmo sem requisições', async ({ page, mocks }) => {
    await page.clock.install()
    await page.goto('/')
    await waitForApp(page)
    await mocks.setConfig({ sessionTtlMs: 60_000 })
    await page.evaluate(async ({ email, password }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('kurio:session', JSON.stringify(await response.json()))
    }, USERS.ana)
    await page.goto('/profile')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    await page.clock.fastForward(61_000)
    await expect(page).toHaveURL('/?auth=login&next=%2Fprofile&reason=expired')
  })

  test('troca de usuário não expõe dados da conta anterior', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/cart')
    await mocks.api('POST', '/cart/items', { editionId: 'ivory-baron-088--open', quantity: 2 })
    await page.reload()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText('Ivory Baron #088')

    await page.getByRole('button', { name: /^Conta de Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    // Espera o logout terminar: o goto recarrega a página e interromperia a requisição.
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    // "Entrar" abre o modal sobre o próprio carrinho.
    await page.getByRole('link', { name: 'Entrar' }).locator('visible=true').click()
    await expect(page).toHaveURL('/cart?auth=login')
    await page.getByLabel('E-mail', { exact: true }).fill(USERS.bruno.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(page.getByText('Ivory Baron #088')).toHaveCount(0)
  })
})

test.describe('Favoritos', () => {
  test('visitante entra pelo modal sem sair do NFT', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await waitForApp(page)
    await page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).locator('visible=true').click()
    await expect(page).toHaveURL('/nfts/emerald-ape-042?auth=login')
    await page.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/nfts/emerald-ape-042')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('favorita com atualização otimista e desfaz quando a API falha @main', async ({ page, mocks }) => {
    await signIn(page, 'ana', '/nfts/emerald-ape-042')
    const favorite = page.getByRole('button', { name: 'Favoritar Emerald Ape #042', exact: true }).locator('visible=true')
    await favorite.click()
    await expect(page.getByText('Adicionado à lista de interesse')).toBeVisible()

    await mocks.setConfig({ failures: { 'DELETE /favorites/:nftId': { kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', times: 1 } } })
    const remove = page.getByRole('button', { name: 'Remover Emerald Ape #042 da lista de interesse' }).locator('visible=true')
    await remove.click()
    // Rollback: volta a "favoritado" e avisa a falha.
    await expect(page.getByText('Não foi possível remover dos favoritos')).toBeVisible()
    await expect(remove).toHaveAttribute('aria-pressed', 'true')

    // Nova tentativa funciona e a lista de interesse reflete o estado.
    await remove.click()
    await expect(page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).locator('visible=true')).toHaveAttribute('aria-pressed', 'false')
    // Espera o servidor confirmar: o goto recarrega a página e interromperia o DELETE em voo.
    await expect(page.getByText('Removido da lista de interesse')).toBeVisible()
    await page.goto('/favorites')
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
    await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
    await expect(page.getByText('Ivory Baron #088')).toBeVisible()
  })
})
