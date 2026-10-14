import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/lib/auth/session-store'

/**
 * Layout sem caminho próprio que protege as rotas filhas (checkout, perfil,
 * carteiras, pedidos). Sem sessão, leva ao login guardando o destino para
 * retomar depois de entrar.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.get()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
