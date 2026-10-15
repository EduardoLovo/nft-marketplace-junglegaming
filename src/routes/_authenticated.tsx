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
      // Se a sessão acabou de expirar, o login mostra o aviso de expiração.
      const expired = sessionStore.lastEndReason() === 'expired'
      throw redirect({ to: '/login', search: { redirect: location.href, ...(expired ? { reason: 'expired' as const } : {}) } })
    }
  },
  component: Outlet,
})
