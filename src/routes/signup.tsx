import { createFileRoute, redirect } from '@tanstack/react-router'
import { authHref } from '@/features/auth/auth-modal'
import { authSearchSchema } from '@/features/auth/schemas'
import { sessionStore } from '@/lib/auth/session-store'

/** Como `/login`: abre o modal de cadastro sobre a home, para links diretos. */
export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ href: search.redirect ?? '/', replace: true })
    throw redirect({ href: authHref('/', { auth: 'signup', next: search.redirect }), replace: true })
  },
})
