import { Link, useRouter } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { notAvailable } from '@/lib/not-available'
import { cn } from '@/lib/utils'

function SocialButtons() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-[13px]">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-3 px-0 sm:px-20">
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

/**
 * Modal de login/cadastro do Figma, renderizado como página (rota própria,
 * acessível por URL e com histórico). No mobile vira tela cheia.
 */
export function AuthCard({
  mode,
  description,
  redirect,
  children,
}: {
  mode: 'login' | 'signup'
  description: string
  redirect?: string
  children: ReactNode
}) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Leva o foco ao título ao abrir/alternar, como num diálogo.
  useEffect(() => {
    headingRef.current?.focus()
  }, [mode])

  const tabClass = (active: boolean) =>
    cn('rounded-sm text-xl font-medium', active ? 'text-primary' : 'text-foreground hover:text-kurio-accent')

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center py-6 lg:py-16">
      {/* Fundo decorativo no lugar da página do mercado desfocada do Figma. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden overflow-hidden rounded-3xl bg-[url('/images/nfts/ape-emerald-640.webp')] bg-cover bg-center opacity-25 blur-2xl lg:block"
      />
      <section
        aria-labelledby="auth-title"
        className="relative w-full max-w-[500px] overflow-hidden rounded-lg bg-surface-card shadow-[0_20px_60px_rgb(10_6_4/0.6)]"
      >
        <button
          type="button"
          onClick={() => (router.history.length > 1 ? router.history.back() : router.navigate({ to: '/' }))}
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-sm p-1 text-primary hover:text-primary-light"
        >
          <XIcon className="size-[18px]" aria-hidden="true" />
        </button>

        <header className="flex flex-col items-center gap-10 px-6 pt-12 pb-6 text-center sm:px-12">
          <h1 id="auth-title" ref={headingRef} tabIndex={-1} className="sr-only outline-none">
            {mode === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}
          </h1>
          <nav aria-label="Entrar ou criar conta" className="flex items-center gap-2">
            <Link
              to="/login"
              search={{ redirect }}
              aria-current={mode === 'login' ? 'page' : undefined}
              className={tabClass(mode === 'login')}
            >
              Entrar
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-coral" />
            <Link
              to="/signup"
              search={{ redirect }}
              aria-current={mode === 'signup' ? 'page' : undefined}
              className={tabClass(mode === 'signup')}
            >
              Criar conta
            </Link>
          </nav>
          <p className="max-w-[404px] text-[13px] leading-4">{description}</p>
        </header>

        <div className="px-6 sm:px-20">{children}</div>

        <div className="px-6 py-6 sm:px-0">
          <SocialButtons />
        </div>
        <div aria-hidden="true" className="h-2.5 bg-primary" />
      </section>
    </div>
  )
}
