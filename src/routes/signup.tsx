import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { PASSWORD_RULES } from '@/contracts/auth'
import { AuthCard } from '@/features/auth/components/auth-card'
import { useSignup } from '@/features/auth/hooks'
import { authSearchSchema, signupSchema, type SignupValues } from '@/features/auth/schemas'
import { isApiError } from '@/lib/api/errors'
import { useDocumentTitle } from '@/lib/use-document-title'
import { sessionStore } from '@/lib/auth/session-store'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ href: search.redirect ?? '/' })
  },
  component: SignupPage,
})

const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const

function SignupPage() {
  const { redirect: destination } = Route.useSearch()
  const router = useRouter()
  const signup = useSignup()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  useDocumentTitle('Criar conta')

  const onSubmit = form.handleSubmit(({ name, email, password }) => {
    signup.mutate(
      { name, email, password },
      {
        onSuccess: (session) => {
          toast.success(`Conta criada. Boas-vindas, ${session.user.name}!`)
          void router.navigate({ href: destination ?? '/', replace: true })
        },
        onError: (error) => {
          if (!isApiError(error)) return
          let focused = false
          for (const [field, message] of Object.entries(error.fields)) {
            if ((FIELDS as readonly string[]).includes(field)) {
              // Conflitos (e-mail/usuário já usados) aparecem no próprio campo, com foco nele.
              form.setError(field as (typeof FIELDS)[number], { message }, { shouldFocus: !focused })
              focused = true
            }
          }
        },
      },
    )
  })

  const formError =
    signup.error && (!isApiError(signup.error) || Object.keys(signup.error.fields).length === 0)
      ? isApiError(signup.error)
        ? signup.error.message
        : 'Não foi possível criar a conta. Tente novamente.'
      : null

  return (
    <AuthCard
      mode="signup"
      redirect={destination}
      description="Crie seu perfil de colecionador e conecte uma carteira quando quiser."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {formError && (
          <p role="alert" className="rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
            {formError}
          </p>
        )}
        <TextField
          label="Nome de usuário"
          hideLabel
          autoComplete="username"
          placeholder="Nome de usuário"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="E-mail"
          hideLabel
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Senha"
          hideLabel
          type="password"
          autoComplete="new-password"
          placeholder="Senha"
          hint={PASSWORD_RULES.message}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <TextField
          label="Confirmar senha"
          hideLabel
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" disabled={signup.isPending} className="mt-6 h-[45px] rounded-[5px] text-base font-bold">
          {signup.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  )
}
