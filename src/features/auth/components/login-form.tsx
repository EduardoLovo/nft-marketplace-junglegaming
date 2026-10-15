import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlertIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { notAvailable } from '@/lib/not-available'
import { useLogin } from '../hooks'
import { loginSchema, type LoginValues } from '../schemas'

export function LoginForm({ expired, onSuccess }: { expired: boolean; onSuccess: () => void }) {
  const login = useLogin()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await login.mutateAsync(values)
      toast.success(`Bem-vindo de volta, ${session.user.name.split(' ')[0]}!`)
      onSuccess()
    } catch (error) {
      // Erros por campo vão para os campos; os demais aparecem no alerta abaixo.
      applyApiFieldErrors(form, error, ['email', 'password'])
    }
  })

  const formError =
    login.error && (!isApiError(login.error) || Object.keys(login.error.fields).length === 0)
      ? isApiError(login.error)
        ? login.error.message
        : 'Não foi possível entrar. Tente novamente.'
      : null

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {expired && (
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
        variant="auth"
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        variant="auth"
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
          className="rounded-sm text-sm leading-4 text-primary hover:underline"
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" disabled={login.isPending} className="mt-7 h-[60px] rounded-[10px] text-base leading-4 font-bold sm:mt-3 sm:h-[45px] sm:rounded-[5px]">
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
