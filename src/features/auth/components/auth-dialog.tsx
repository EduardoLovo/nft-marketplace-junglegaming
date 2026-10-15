import { useRouter, useSearch } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { notAvailable } from '@/lib/not-available'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { useAuthModal, type AuthMode } from '../auth-modal'
import { useSession } from '../use-session'
import { LoginForm } from './login-form'
import { SignupForm } from './signup-form'

const DESCRIPTION: Record<AuthMode, string> = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  signup: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

function SocialButtons() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-[13px]">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-3 px-0 sm:px-20">
        {/* Login social não faz parte do desafio: avisa em vez de simular sucesso. */}
        {['Google', 'Facebook'].map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => notAvailable(`O login com ${provider}`)}
            className="flex h-10 items-center justify-center gap-2 rounded-[5px] border border-border text-sm hover:border-primary"
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white',
                provider === 'Google' ? 'bg-[#4086f4]' : 'bg-[#3b5999]',
              )}
            >
              {provider[0]}
            </span>
            Continuar com {provider}
          </button>
        ))}
      </div>
    </div>
  )
}

function AuthPanel({ mode, expired, next }: { mode: AuthMode; expired: boolean; next?: string }) {
  const modal = useAuthModal()
  const router = useRouter()
  useDocumentTitle(mode === 'login' ? 'Entrar' : 'Criar conta')

  // Com destino (ex.: rota protegida), segue para ele; senão, fica na página atual.
  function onSuccess() {
    if (next) void router.navigate({ href: next, replace: true })
    else modal.close()
  }

  const tabClass = (active: boolean) =>
    cn('rounded-sm text-xl font-medium', active ? 'text-primary' : 'text-foreground hover:text-kurio-accent')

  return (
    <>
      <header className="flex flex-col items-center gap-10 px-6 pt-12 pb-6 text-center sm:px-12">
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>
        {/* Abas: os botões de envio dos formulários também se chamam "Entrar" e "Criar conta". */}
        <div role="tablist" aria-label="Entrar ou criar conta" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => modal.switchTo('login')}
            role="tab"
            aria-selected={mode === 'login'}
            className={tabClass(mode === 'login')}
          >
            Entrar
          </button>
          <span aria-hidden="true" className="h-5 w-px bg-coral" />
          <button
            type="button"
            onClick={() => modal.switchTo('signup')}
            role="tab"
            aria-selected={mode === 'signup'}
            className={tabClass(mode === 'signup')}
          >
            Criar conta
          </button>
        </div>
        <DialogDescription className="max-w-[404px] text-[13px] leading-4 text-foreground">
          {DESCRIPTION[mode]}
        </DialogDescription>
      </header>

      <div className="px-6 sm:px-20">
        {/* A key recria o formulário ao alternar, limpando valores e erros. */}
        {mode === 'login' ? (
          <LoginForm key="login" expired={expired} onSuccess={onSuccess} />
        ) : (
          <SignupForm key="signup" onSuccess={onSuccess} />
        )}
      </div>

      <div className="px-6 py-6 sm:px-0">
        <SocialButtons />
      </div>
      <div aria-hidden="true" className="h-2.5 shrink-0 bg-primary" />
    </>
  )
}

/**
 * Modal de login/cadastro do Figma, aberto sobre a página atual pelo
 * parâmetro `?auth=` (ver `auth-modal.ts`). No mobile ocupa a tela inteira.
 */
export function AuthDialog() {
  const search = useSearch({ strict: false }) as { auth?: AuthMode; next?: string; reason?: 'expired' }
  const session = useSession()
  const modal = useAuthModal()
  // Já logado (ex.: link antigo com ?auth=login), o modal não abre.
  const mode = session ? undefined : search.auth

  return (
    <Dialog open={mode !== undefined} onOpenChange={(open) => !open && modal.close()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-dvh flex-col gap-0 overflow-y-auto rounded-lg bg-surface-card p-0 ring-0 sm:max-w-[500px] max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none"
      >
        <DialogClose
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-sm p-1 text-primary hover:text-primary-light"
        >
          <XIcon className="size-[18px]" aria-hidden="true" />
        </DialogClose>
        {mode && <AuthPanel mode={mode} expired={search.reason === 'expired'} next={search.next} />}
      </DialogContent>
    </Dialog>
  )
}
