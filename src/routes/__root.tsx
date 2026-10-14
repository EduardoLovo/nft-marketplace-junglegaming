import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Devtools } from '@/components/devtools'
import { Button } from '@/components/ui/button'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Devtools />
    </>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col items-start justify-center gap-6 px-6">
      <p className="text-sm font-medium uppercase text-kurio-accent">Erro 404</p>
      <h1 className="text-3xl font-bold uppercase">Página não encontrada</h1>
      <p className="text-sm leading-6 text-text-secondary">
        O endereço acessado não existe ou foi removido.
      </p>
      <Button asChild size="lg" className="h-10 px-8 font-bold uppercase">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
