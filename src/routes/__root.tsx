import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Devtools } from '@/components/devtools'
import { MobileTabBar, MobileTopBar } from '@/components/layout/mobile-nav'
import { RealtimeIndicator } from '@/components/layout/realtime-indicator'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { authModalSearchSchema } from '@/features/auth/auth-modal'
import { AuthDialog } from '@/features/auth/components/auth-dialog'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  // O modal de login/cadastro pode abrir sobre qualquer página (`?auth=login`).
  validateSearch: authModalSearchSchema,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      {/* Espaço inferior no mobile para o conteúdo não ficar sob a barra de navegação. */}
      <div className="flex min-h-dvh flex-col px-4 pb-24 md:px-6 lg:pt-6 lg:pb-6 xl:px-0">
        <MobileTopBar />
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 outline-none">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar />
      <RealtimeIndicator />
      <AuthDialog />
      <Toaster position="top-center" />
      <Devtools />
    </>
  )
}

function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <p className="text-sm font-medium uppercase text-kurio-accent">Erro 404</p>
      <h1 className="text-3xl font-bold uppercase">Página não encontrada</h1>
      <p className="text-sm leading-6 text-text-secondary">O endereço acessado não existe ou foi removido.</p>
      <Button asChild size="lg" className="h-10 px-8 font-bold uppercase">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
