import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authHref, withoutAuth } from '@/features/auth/auth-modal'
import { sessionStore } from '@/lib/auth/session-store'

/**
 * Layout sem caminho próprio que protege as rotas filhas (checkout, perfil,
 * carteiras, pedidos). Sem sessão, abre o modal de login sobre a última
 * página pública exibida (ou a home) e guarda o destino para seguir depois.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location, context }) => {
    if (sessionStore.get()) return
    // Se a sessão acabou de expirar, o login mostra o aviso de expiração.
    const expired = sessionStore.lastEndReason() === 'expired'
    throw redirect({
      href: authHref(context.getPublicBackgroundHref(), {
        auth: 'login',
        next: withoutAuth(location.href),
        reason: expired ? 'expired' : undefined,
      }),
      replace: true,
    })
  },
  component: Outlet,
})
