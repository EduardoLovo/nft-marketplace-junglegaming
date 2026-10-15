import { expect, signIn, test, USERS } from './fixtures'

test.describe('Perfil e carteiras', () => {
  test('edita o perfil com erros da API e persiste após refresh @main', async ({ page }) => {
    await signIn(page, 'ana', '/profile')
    const profile = page.locator('form[aria-labelledby="profile-data-title"]')

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
    await expect(page.getByRole('button', { name: /^Conta de Ana S\. Souza/ }).or(page.getByRole('link', { name: /Perfil de Ana S\. Souza/ }))).toBeVisible()
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
    const form = page.locator('form[aria-labelledby="password-title"]')

    await form.getByLabel('Senha atual', { exact: true }).fill('errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('Senha atual incorreta.')).toBeVisible()

    await form.getByLabel('Senha atual', { exact: true }).fill(USERS.ana.password)
    await form.getByRole('button', { name: 'Alterar senha' }).click()
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
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Adicionar carteira' })

    await dialog.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(dialog.getByText('Selecione o tipo de carteira.')).toBeVisible()

    await dialog.getByLabel('Apelido da carteira').fill('Coleção fria')
    await dialog.getByLabel('Tipo de carteira').selectOption('walletconnect')
    // Endereço já cadastrado: conflito da API no campo.
    await dialog.getByLabel('Endereço da carteira').fill('0x7A42c1F09b3E5d2A84b0Ce9F71aD3E6B21C419E8')
    await dialog.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(dialog.getByText('Esta carteira já está cadastrada.')).toBeVisible()

    await dialog.getByLabel('Endereço da carteira').fill('0x1111222233334444555566667777888899990000')
    await dialog.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira adicionada')).toBeVisible()

    const card = page.getByRole('listitem').filter({ hasText: 'Coleção fria' })
    await card.getByRole('button', { name: 'Tornar principal' }).click()
    await expect(page.locator('section[aria-labelledby="main-wallet-title"]')).toContainText('Coleção fria')

    await page.getByRole('button', { name: 'Editar Coleção fria' }).click()
    await page.getByRole('dialog', { name: 'Editar carteira' }).getByLabel('Apelido da carteira').fill('Cofre')
    await page.getByRole('dialog', { name: 'Editar carteira' }).getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira atualizada')).toBeVisible()

    await page.getByRole('button', { name: 'Remover Cofre' }).click()
    await page.getByRole('dialog', { name: 'Remover carteira?' }).getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Carteira removida')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Cofre' })).toHaveCount(0)
  })
})
