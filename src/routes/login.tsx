import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/features/auth/components/auth-card'
import { useLogin } from '@/features/auth/hooks'
import { authSearchSchema, loginSchema, type LoginValues } from '@/features/auth/schemas'
import { isApiError } from '@/lib/api/errors'
import { sessionStore } from '@/lib/auth/session-store'
import { notAvailable } from '@/lib/not-available'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  // Já logado: segue direto para o destino.
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ href: search.redirect ?? '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: destination, reason } = Route.useSearch()
  const router = useRouter()
  const login = useLogin()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  useDocumentTitle('Entrar')

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (session) => {
        toast.success(`Bem-vindo de volta, ${session.user.name.split(' ')[0]}!`)
        void router.navigate({ href: destination ?? '/', replace: true })
      },
      onError: (error) => {
        // Erros por campo vêm da API; o resto aparece no alerta do formulário.
        if (isApiError(error)) {
          for (const [field, message] of Object.entries(error.fields)) {
            if (field === 'email' || field === 'password') form.setError(field, { message })
          }
        }
      },
    })
  })

  const formError = login.error && isApiError(login.error) && Object.keys(login.error.fields).length === 0
    ? login.error.message
    : login.error && !isApiError(login.error)
      ? 'Não foi possível entrar. Tente novamente.'
      : null

  return (
    <AuthCard
      mode="login"
      redirect={destination}
      description="Entre para gerenciar sua carteira, coleção e perfil de criador."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {reason === 'expired' && (
          <p role="status" className="flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm">
            <TriangleAlertIcon className="size-4 shrink-0 text-amber" aria-hidden="true" />
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        )}
        {formError && (
          <p role="alert" className="rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
            {formError}
          </p>
        )}
        <TextField
          label="E-mail"
          hideLabel
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Senha"
          hideLabel
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => notAvailable('A recuperação de senha')}
            className="rounded-sm text-sm text-primary hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
        <Button type="submit" disabled={login.isPending} className="mt-6 h-[45px] rounded-[5px] text-base font-bold">
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  )
}
