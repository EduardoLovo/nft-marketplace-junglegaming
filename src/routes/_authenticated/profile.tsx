import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { AVATAR_RULES, ENS_PATTERN, PASSWORD_RULES, USERNAME_RULES, type User } from '@/contracts/auth'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '@/features/account/api'
import { AccountLayout } from '@/features/account/components/account-layout'
import { UserAvatar } from '@/features/auth/components/user-menu'
import { useSession } from '@/features/auth/use-session'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Use de 2 a 40 caracteres.').max(40, 'Use de 2 a 40 caracteres.'),
  username: z.string().trim().toLowerCase().regex(USERNAME_RULES.pattern, USERNAME_RULES.message),
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || ENS_PATTERN.test(value), 'Use um nome ENS válido, terminado em .eth.'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(PASSWORD_RULES.minLength, PASSWORD_RULES.message)
      .regex(PASSWORD_RULES.pattern, PASSWORD_RULES.message),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : 'Tente novamente em instantes.')

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, username: user.username, email: user.email, ensName: user.ensName ?? '' },
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      { ...values, ensName: values.ensName || null },
      {
        onSuccess: (saved) => {
          form.reset({ name: saved.name, username: saved.username, email: saved.email, ensName: saved.ensName ?? '' })
          toast.success('Perfil atualizado')
        },
        onError: (error) => {
          if (!applyApiFieldErrors(form, error, ['name', 'username', 'email', 'ensName'])) {
            toast.error('Não foi possível salvar o perfil', { description: errorMessage(error) })
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="profile-data-title" className="flex flex-col gap-4">
      <h2 id="profile-data-title" className="text-base font-bold">
        Perfil do colecionador
      </h2>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <TextField label="Nome de exibição" autoComplete="name" error={errors.name?.message} {...form.register('name')} />
        <TextField label="Nome de usuário" autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <TextField label="Nome ENS" placeholder="seunome.eth" error={errors.ensName?.message} {...form.register('ensName')} />
      </div>
      <Button type="submit" disabled={update.isPending || !isDirty} className="w-fit px-8 font-bold">
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function AvatarSection({ user }: { user: User }) {
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
    <div aria-labelledby="avatar-title" role="group" className="flex flex-col gap-3">
      <h2 id="avatar-title" className="text-base font-bold">
        Avatar
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar user={user} className="size-20 text-xl" />
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_RULES.types.join(',')}
            onChange={onFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
            {upload.isPending ? 'Enviando…' : 'Alterar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy || !user.avatarUrl}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success('Avatar removido'),
                onError: (err) => setError(errorMessage(err)),
              })
            }
          >
            Remover
          </Button>
        </div>
      </div>
      <p className="text-xs text-text-muted">PNG, JPEG ou WebP. A imagem é recortada em quadrado.</p>
      {error && (
        <p role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) => {
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          toast.success('Senha alterada', { description: 'As outras sessões da sua conta foram encerradas.' })
        },
        onError: (error) => {
          if (!applyApiFieldErrors(form, error, ['currentPassword', 'newPassword'])) {
            toast.error('Não foi possível alterar a senha', { description: errorMessage(error) })
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="password-title" className="flex flex-col gap-4">
      <h2 id="password-title" className="text-base font-bold">
        Alterar senha
      </h2>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        <TextField label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <TextField label="Nova senha" type="password" autoComplete="new-password" hint={PASSWORD_RULES.message} error={errors.newPassword?.message} {...form.register('newPassword')} />
        <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      </div>
      <Button type="submit" disabled={change.isPending} className="w-fit px-8 font-bold">
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}

function ProfilePage() {
  useDocumentTitle('Meu perfil')
  // A rota é protegida: aqui sempre há sessão.
  const user = useSession()!.user

  return (
    <AccountLayout title="Dados do perfil">
      <div className="flex flex-col gap-8 bg-surface-card p-5 sm:p-6">
        {/* A key recria o formulário se outro lugar alterar o usuário (ex.: outra aba). */}
        <ProfileForm key={`${user.name}|${user.username}|${user.email}|${user.ensName}`} user={user} />
        <hr className="border-border" />
        <AvatarSection user={user} />
        <hr className="border-border" />
        <PasswordForm />
      </div>
    </AccountLayout>
  )
}
