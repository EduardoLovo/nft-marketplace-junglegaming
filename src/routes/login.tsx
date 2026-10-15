import { createFileRoute, redirect } from '@tanstack/react-router'
import { authHref } from '@/features/auth/auth-modal'
import { authSearchSchema } from '@/features/auth/schemas'
import { sessionStore } from '@/lib/auth/session-store'

/**
 * O login é um modal sobre a página atual (`?auth=login`). Esta rota existe
 * para links diretos e antigos: abre o modal sobre a home, mantendo o destino.
 */
export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ href: search.redirect ?? '/', replace: true })
    throw redirect({
      href: authHref('/', { auth: 'login', next: search.redirect, reason: search.reason }),
      replace: true,
    })
  },
})
