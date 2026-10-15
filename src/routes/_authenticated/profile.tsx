import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { AVATAR_RULES, ENS_PATTERN, PASSWORD_RULES, USERNAME_RULES, type User } from '@/contracts/auth'
import type { Wallet } from '@/contracts/wallets'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '@/features/account/api'
import { ImageIcon } from '@/features/account/components/account-icons'
import { AccountLayout } from '@/features/account/components/account-layout'
import { ArrowDownIcon } from '@/features/checkout/components/checkout-icons'
import { useSession } from '@/features/auth/use-session'
import { useUpdateWallet, useWallets } from '@/features/wallets/api'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

/** Formulário único do Figma: dados, apelido da carteira e, se preenchida, a troca de senha. */
const profileSchema = z
  .object({
    name: z.string().trim().min(2, 'Use de 2 a 40 caracteres.').max(40, 'Use de 2 a 40 caracteres.'),
    username: z.string().trim().toLowerCase().regex(USERNAME_RULES.pattern, USERNAME_RULES.message),
    email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    ensLocal: z.string().trim().toLowerCase(),
    ensSuffix: z.string(),
    walletLabel: z.string().trim().max(30, 'Use no máximo 30 caracteres.'),
    hasWallet: z.boolean(),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (values.ensLocal && !ENS_PATTERN.test(`${values.ensLocal}${values.ensSuffix}`)) {
      issue('ensLocal', 'Use letras, números, hífens e pontos (ex.: seunome).')
    }
    if (values.hasWallet && values.walletLabel.length < 2) issue('walletLabel', 'Informe o apelido da carteira.')
    // Senha é opcional: só valida quando algum dos três campos foi preenchido.
    if (values.currentPassword || values.newPassword || values.confirmPassword) {
      if (!values.currentPassword) issue('currentPassword', 'Informe a senha atual.')
      if (values.newPassword.length < PASSWORD_RULES.minLength || !PASSWORD_RULES.pattern.test(values.newPassword)) {
        issue('newPassword', PASSWORD_RULES.message)
      }
      if (values.newPassword !== values.confirmPassword) issue('confirmPassword', 'As senhas não conferem.')
    }
  })

type ProfileValues = z.infer<typeof profileSchema>

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : 'Tente novamente em instantes.')

/** "Avatar" do Figma: círculo de 50px, "Alterar" (98x40) e "Remover". Envia na hora. */
function AvatarField({ user }: { user: User }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const busy = upload.isPending || remove.isPending

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(undefined)
    // Validação imediata do formato; o tamanho é resolvido redimensionando no cliente.
    if (!(AVATAR_RULES.types as readonly string[]).includes(file.type)) {
      setError('Use uma imagem PNG, JPEG ou WebP.')
      return
    }
    upload.mutate(file, {
      onSuccess: () => toast.success('Avatar atualizado'),
      onError: (err) => setError(isApiError(err) ? (err.fields.avatar ?? err.message) : 'Não foi possível enviar a imagem.'),
    })
  }

  return (
    <div role="group" aria-labelledby="avatar-title" className="flex flex-col gap-2.5">
      <p id="avatar-title" className="text-[15px] leading-[15px]">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`Avatar de ${user.name}`} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-kurio-secondary" />
          )}
        </span>
        <div className="flex items-center gap-5">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_RULES.types.join(',')}
            onChange={onFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-10 w-[98px] rounded-[3px] text-sm leading-4 font-bold"
          >
            {upload.isPending ? 'Enviando…' : 'Alterar'}
          </Button>
          <button
            type="button"
            disabled={busy || !user.avatarUrl}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success('Avatar removido'),
                onError: (err) => setError(errorMessage(err)),
              })
            }
            className="rounded-sm text-sm leading-4 hover:text-coral disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

function ProfileForm({ user, wallet }: { user: User; wallet: Wallet | undefined }) {
  const update = useUpdateProfile()
  const updateWallet = useUpdateWallet()
  const changePassword = useChangePassword()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user.name,
      username: user.username,
      email: user.email,
      ensLocal: user.ensName?.replace(/\.eth$/, '') ?? '',
      ensSuffix: '.eth',
      walletLabel: wallet?.label ?? '',
      hasWallet: Boolean(wallet),
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    resetOptions: { keepDirtyValues: true },
  })
  const { errors, dirtyFields } = form.formState
  const saving = update.isPending || updateWallet.isPending || changePassword.isPending

  // `mutateAsync`: salvar atualiza a sessão e recria partes da tela; callbacks
  // do `mutate` de um componente desmontado seriam descartados.
  const onSubmit = form.handleSubmit(async (values) => {
    const profileDirty = dirtyFields.name || dirtyFields.username || dirtyFields.email || dirtyFields.ensLocal
    const passwordFilled = Boolean(values.currentPassword)
    let saved = false
    try {
      if (profileDirty) {
        await update.mutateAsync({
          name: values.name,
          username: values.username,
          email: values.email,
          ensName: values.ensLocal ? `${values.ensLocal}${values.ensSuffix}` : null,
        })
        saved = true
      }
      if (wallet && dirtyFields.walletLabel) {
        await updateWallet.mutateAsync({ id: wallet.id, input: { label: values.walletLabel } })
        saved = true
      }
    } catch (error) {
      const mapped = applyApiFieldErrors(form, error, ['name', 'username', 'email'])
      if (isApiError(error) && error.fields.ensName) form.setError('ensLocal', { message: error.fields.ensName })
      else if (isApiError(error) && error.fields.label) form.setError('walletLabel', { message: error.fields.label })
      else if (!mapped) toast.error('Não foi possível salvar o perfil', { description: errorMessage(error) })
      return
    }
    if (saved) toast.success('Perfil atualizado')

    if (passwordFilled) {
      try {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
        form.resetField('currentPassword', { defaultValue: '' })
        form.resetField('newPassword', { defaultValue: '' })
        form.resetField('confirmPassword', { defaultValue: '' })
        toast.success('Senha alterada', { description: 'As outras sessões da sua conta foram encerradas.' })
      } catch (error) {
        if (!applyApiFieldErrors(form, error, ['currentPassword', 'newPassword'])) {
          toast.error('Não foi possível alterar a senha', { description: errorMessage(error) })
        }
      }
    } else if (!saved) {
      toast.info('Nada para salvar', { description: 'Altere algum campo antes de salvar.' })
    }
  })

  const ensError = errors.ensLocal?.message
  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="account-title" className="flex flex-col gap-8">
      {/* "Fields": duas colunas de 417px separadas por 28px, 24px entre as linhas. */}
      <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
        <TextField variant="profile" label="Nome de exibição" required autoComplete="name" error={errors.name?.message} {...form.register('name')} />
        <TextField variant="profile" label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField variant="profile" label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />

        {/* "Nome ENS": domínio (78px) + nome (329px), como no Figma. */}
        <div role="group" aria-labelledby="ens-label" className="flex flex-col gap-2.5">
          <p id="ens-label" className="flex h-[29px] items-center gap-1 text-[15px] leading-[15px]">
            Nome ENS
            <span aria-hidden="true" className="text-[22px] leading-none text-coral">
              *
            </span>
          </p>
          <div className="flex gap-2.5">
            <div className="relative w-[78px] shrink-0">
              <label htmlFor="ens-suffix" className="sr-only">
                Domínio ENS
              </label>
              <select
                id="ens-suffix"
                className="h-10 w-full appearance-none rounded-[3px] border border-border bg-transparent pl-2.5 text-[15px] leading-[15px] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                {...form.register('ensSuffix')}
              >
                <option value=".eth" className="bg-surface-card">
                  .eth
                </option>
              </select>
              <ArrowDownIcon className="pointer-events-none absolute top-1/2 right-[5px] size-5 -translate-y-1/2 text-foreground" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="ens-local" className="sr-only">
                Nome ENS
              </label>
              <input
                id="ens-local"
                placeholder="seunome"
                aria-invalid={ensError ? true : undefined}
                aria-describedby={ensError ? 'ens-local-error' : undefined}
                className="h-10 w-full rounded-[3px] border border-border bg-transparent px-[13px] text-sm placeholder:text-kurio-secondary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none aria-invalid:border-coral"
                {...form.register('ensLocal')}
              />
            </div>
          </div>
          {ensError && (
            <p id="ens-local-error" className="text-xs text-coral">
              {ensError}
            </p>
          )}
        </div>

        {/* Apelido da carteira principal (editável também em Carteiras). */}
        <TextField
          variant="profile"
          label="Apelido da carteira"
          required
          disabled={!wallet}
          placeholder={wallet ? undefined : 'Cadastre uma carteira em Carteiras'}
          error={errors.walletLabel?.message}
          {...form.register('walletLabel')}
        />
        <AvatarField user={user} />
      </div>

      {/* "Change Password": coluna de 417px; os campos são opcionais. */}
      <div className="flex flex-col gap-6 sm:w-[417px]">
        <h2 className="text-base leading-4 font-medium">Alterar senha</h2>
        <TextField variant="profile-compact" label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <TextField variant="profile-compact" label="Nova senha" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...form.register('newPassword')} />
        <TextField variant="profile-compact" label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      </div>

      <Button type="submit" disabled={saving} className="h-10 w-[131px] rounded-[3px] text-sm leading-4 font-bold">
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function ProfilePage() {
  useDocumentTitle('Meu perfil')
  // A rota é protegida: aqui sempre há sessão.
  const user = useSession()!.user
  const { data: wallets } = useWallets()
  const defaultWallet = wallets?.find((wallet) => wallet.isDefault) ?? wallets?.[0]

  return (
    <AccountLayout title="Perfil do colecionador">
      <ProfileForm user={user} wallet={defaultWallet} />
    </AccountLayout>
  )
}
