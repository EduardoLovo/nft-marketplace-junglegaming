import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
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
        variant="auth"
        autoComplete="username"
        placeholder="Nome de usuário"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <TextField
        label="E-mail"
        hideLabel
        variant="auth"
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        variant="auth"
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        hideLabel
        variant="auth"
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        revealable="mobile"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <Button type="submit" disabled={signup.isPending} className="mt-7 h-[60px] rounded-[10px] text-base leading-4 font-bold sm:mt-3 sm:h-[45px] sm:rounded-[5px]">
        {signup.isPending ? (
          'Criando conta…'
        ) : (
          // O Figma chama o botão de "Criar perfil" no mobile e "Criar conta" no desktop.
          <>
            <span className="sm:hidden">Criar perfil</span>
            <span className="max-sm:hidden">Criar conta</span>
          </>
        )}
      </Button>
    </form>
  )
}
