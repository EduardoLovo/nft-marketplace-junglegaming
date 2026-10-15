import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { PASSWORD_RULES } from '@/contracts/auth'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { useSignup } from '../hooks'
import { signupSchema, type SignupValues } from '../schemas'

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const signup = useSignup()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    try {
      const session = await signup.mutateAsync({ name, email, password })
      toast.success(`Conta criada. Boas-vindas, ${session.user.name}!`)
      onSuccess()
    } catch (error) {
      // Conflitos (e-mail já usado) aparecem no próprio campo, com foco nele.
      applyApiFieldErrors(form, error, ['name', 'email', 'password', 'confirmPassword'])
    }
  })

  const formError =
    signup.error && (!isApiError(signup.error) || Object.keys(signup.error.fields).length === 0)
      ? isApiError(signup.error)
        ? signup.error.message
        : 'Não foi possível criar a conta. Tente novamente.'
      : null

  return (
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
  )
}
