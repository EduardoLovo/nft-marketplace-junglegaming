import { useRouter, useSearch } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { notAvailable } from '@/lib/not-available'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { useAuthModal, type AuthMode } from '../auth-modal'
import { useSession } from '../use-session'
import { LoginForm } from './login-form'
import { FacebookIcon, GoogleIcon } from './social-icons'
import { SignupForm } from './signup-form'

const DESCRIPTION: Record<AuthMode, string> = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  signup: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

/**
 * Bloco social. Desktop: linhas do divisor ocupam toda a largura do modal e o
 * login usa 12px entre os itens (cadastro 16px). Mobile ("Mobile Social Block"):
 * linhas de 110px, botões na largura toda e 16px entre eles.
 */
function SocialButtons({ mode }: { mode: AuthMode }) {
  const gap = mode === 'login' ? 'sm:gap-3' : 'sm:gap-4'
  return (
    <div className={cn('flex flex-col gap-3', gap)}>
      <div className="flex items-center justify-center gap-2.5 text-[13px] leading-4 sm:gap-3">
        <span aria-hidden="true" className="h-px w-[110px] bg-border sm:w-auto sm:flex-1" />
        Ou continue com
        <span aria-hidden="true" className="h-px w-[110px] bg-border sm:w-auto sm:flex-1" />
      </div>
      <div className={cn('flex flex-col gap-4 sm:px-20', gap)}>
        {/* Login social não faz parte do desafio: avisa em vez de simular sucesso. */}
        {[
          { provider: 'Google', Icon: GoogleIcon },
          { provider: 'Facebook', Icon: FacebookIcon },
        ].map(({ provider, Icon }) => (
          <button
            key={provider}
            type="button"
            onClick={() => notAvailable(`O login com ${provider}`)}
            className="flex h-10 items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] font-medium text-text-secondary hover:border-primary"
          >
            <Icon className="size-5" />
            Continuar com {provider}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Títulos das telas mobile do Figma, que não têm as abas do desktop. */
const MOBILE_TITLE: Record<AuthMode, { text: string; className: string }> = {
  login: { text: 'Entrar', className: 'text-xl/4' },
  signup: { text: 'Criar perfil de colecionador', className: 'text-lg/4' },
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
    cn('rounded-sm text-xl leading-5 font-medium', active ? 'text-primary' : 'text-foreground hover:text-kurio-accent')

  return (
    // Mobile: telas "Mobile / Login" e "Mobile / Cadastro" (padding 80/28/24 e
    // 40px entre os blocos). Desktop: modal de 500px com as posições do Figma.
    <div className="flex flex-1 flex-col gap-10 px-7 pt-20 pb-6 sm:gap-0 sm:p-0">
      <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>

      <p aria-hidden="true" className="flex h-[136px] items-center justify-center text-[32px] font-bold sm:hidden">
        KURIO
      </p>
      <p aria-hidden="true" className={cn('text-center font-bold sm:hidden', MOBILE_TITLE[mode].className)}>
        {MOBILE_TITLE[mode].text}
      </p>

      <header className="hidden flex-col items-center gap-10 px-12 pt-12 text-center sm:flex">
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

      <div className="sm:px-20 sm:pt-6">
        {/* A key recria o formulário ao alternar, limpando valores e erros. */}
        {mode === 'login' ? (
          <LoginForm key="login" expired={expired} onSuccess={onSuccess} />
        ) : (
          <SignupForm key="signup" onSuccess={onSuccess} />
        )}
      </div>

      <div className="sm:py-6">
        <SocialButtons mode={mode} />
      </div>

      {/* No mobile não há abas: o link no fim da tela alterna entre os modos. */}
      <p className="text-center text-[15px] leading-4 text-text-secondary sm:hidden">
        {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <button
          type="button"
          onClick={() => modal.switchTo(mode === 'login' ? 'signup' : 'login')}
          className="rounded-sm underline underline-offset-4 hover:text-foreground"
        >
          {mode === 'login' ? 'Crie uma conta' : 'Entre'}
        </button>
      </p>

      {/* Faixa cobre colada à base do modal (só no desktop); o espaço acima dela é o do Figma. */}
      <div aria-hidden="true" className="mt-auto hidden h-2.5 shrink-0 bg-primary sm:block" />
    </div>
  )
}

/**
 * Modal de login/cadastro do Figma, aberto sobre a página atual pelo
 * parâmetro `?auth=` (ver `auth-modal.ts`). No mobile vira a tela inteira do Figma.
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
        // O foco inicial vai para o primeiro campo (e-mail ou nome), não para o X.
        onOpenAutoFocus={(event) => {
          const field = (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input')
          if (!field) return
          event.preventDefault()
          field.focus()
        }}
        className={cn(
          'flex max-h-dvh flex-col gap-0 overflow-y-auto bg-ink p-0 sm:bg-surface-card ring-0 sm:max-w-[500px] max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none',
          // Altura e cantos de cada modal no Figma: login 500x600 reto, cadastro 500x656 com raio 8.
          mode === 'signup' ? 'sm:h-[656px] sm:rounded-lg' : 'sm:h-[600px] sm:rounded-none',
        )}
      >
        <DialogClose
          aria-label="Fechar"
          className="absolute top-2 right-[9px] rounded-sm text-primary hover:text-primary-light"
        >
          <XIcon className="size-6" aria-hidden="true" />
        </DialogClose>
        {mode && <AuthPanel mode={mode} expired={search.reason === 'expired'} next={search.next} />}
      </DialogContent>
    </Dialog>
  )
}
