import { expect, signIn, test, USERS } from './fixtures'

test.describe('Perfil e carteiras', () => {
  test('edita o perfil com erros da API e persiste após refresh @main', async ({ page, compact }) => {
    await signIn(page, 'ana', '/profile')
    // Formulário único do Figma: dados, apelido da carteira e senha.
    const profile = page.locator('form[aria-labelledby="account-title"]')

    await profile.getByLabel('Nome de usuário').fill('Ana Souza!')
    await profile.getByRole('button', { name: 'Salvar' }).click()
    await expect(profile.getByText(/Use de 3 a 30 caracteres/)).toBeVisible()

    // Conflito vindo da API.
    await profile.getByLabel('Nome de usuário').fill('bruno.lima')
    await profile.getByRole('button', { name: 'Salvar' }).click()
    await expect(profile.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await profile.getByLabel('Nome de usuário').fill('ana.colecionadora')
    await profile.getByLabel('Nome de exibição').fill('Ana S. Souza')
    await profile.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()

    await page.reload()
    await expect(profile.getByLabel('Nome de usuário')).toHaveValue('ana.colecionadora')
    await expect(profile.getByLabel('Nome de exibição')).toHaveValue('Ana S. Souza')
    // O menu da conta com o nome só existe no header do desktop (o Figma mobile não tem topo).
    if (!compact) await expect(page.getByRole('button', { name: /^Conta de Ana S\. Souza/ })).toBeVisible()
  })

  test('envia e remove avatar, recusando formato inválido', async ({ page }) => {
    await signIn(page, 'ana', '/profile')
    const fileInput = page.locator('input[type="file"]')

    await fileInput.setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
    await expect(page.getByText('Use uma imagem PNG, JPEG ou WebP.')).toBeVisible()

    // PNG 1x1 válido; o app redimensiona para 256x256 WebP antes de enviar.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    await fileInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByText('Avatar atualizado')).toBeVisible()
    await expect(page.locator('[aria-labelledby="avatar-title"] img')).toHaveAttribute('src', /^data:image\/webp/)

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByText('Avatar removido')).toBeVisible()
  })

  test('altera a senha validando a senha atual', async ({ page }) => {
    await signIn(page, 'ana', '/profile')
    const form = page.locator('form[aria-labelledby="account-title"]')

    await form.getByLabel('Senha atual', { exact: true }).fill('errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('Senha atual incorreta.')).toBeVisible()

    await form.getByLabel('Senha atual', { exact: true }).fill(USERS.ana.password)
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Senha alterada')).toBeVisible()

    const login = await page.evaluate(async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@kurio.dev', password: 'NovaSenha1' }),
      })
      return response.status
    })
    expect(login).toBe(200)
  })

  test('cadastra, edita, define principal e remove carteiras', async ({ page }) => {
    await signIn(page, 'ana', '/wallets')
    // "Adicionar" da carteira secundária abre o formulário do Figma abaixo da seção.
    await page.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
    const form = page.getByRole('form', { name: 'Adicionar carteira' })

    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Selecione o tipo de carteira.')).toBeVisible()

    await form.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Coleção fria')
    await form.getByRole('combobox', { name: 'Rede' }).selectOption('ethereum')
    await form.getByRole('combobox', { name: 'Tipo de carteira' }).selectOption('walletconnect')
    // Endereço já cadastrado: conflito da API no campo.
    await form.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x7A42c1F09b3E5d2A84b0Ce9F71aD3E6B21C419E8')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Esta carteira já está cadastrada.')).toBeVisible()

    await form.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x1111222233334444555566667777888899990000')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira adicionada')).toBeVisible()

    // Vira a principal: o formulário de cima passa a editá-la.
    const item = page.getByRole('listitem').filter({ hasText: 'Coleção fria' })
    await item.getByRole('button', { name: 'Tornar principal' }).click()
    const main = page.getByRole('form', { name: 'Editar Coleção fria' })
    await expect(main.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue('Coleção fria')

    await main.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Cofre')
    await main.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira atualizada')).toBeVisible()

    // A antiga principal agora é secundária e pode ser removida.
    await page.getByRole('button', { name: 'Remover Principal' }).click()
    await page.getByRole('dialog', { name: 'Remover carteira?' }).getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Carteira removida')).toBeVisible()
    await expect(page.getByText('Principal', { exact: true })).toHaveCount(0)
  })

})
