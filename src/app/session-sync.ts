import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchSession, PRIVATE_QUERY_ROOTS } from '@/features/auth/api'
import { sessionStore } from '@/lib/auth/session-store'
import type { createAppRouter } from './router'

type AppRouter = ReturnType<typeof createAppRouter>

/**
 * A URL atual exige login? (rotas sob o layout `_authenticated`). Usa
 * `matchRoutes` em vez das rotas já carregadas: a validação da sessão pode
 * responder durante o carregamento inicial, quando ainda não há rotas ativas.
 */
const isOnProtectedRoute = (router: AppRouter) =>
  router.matchRoutes(router.state.location).some((match) => match.routeId.startsWith('/_authenticated'))

function clearPrivateData(queryClient: QueryClient) {
  for (const root of PRIVATE_QUERY_ROOTS) {
    // Cancela antes de remover: uma resposta em voo da conta anterior não
    // pode repovoar o cache depois da troca.
    void queryClient.cancelQueries({ queryKey: [root] })
    queryClient.removeQueries({ queryKey: [root] })
  }
}

/**
 * Mantém cache, navegação e sessão coerentes:
 * - troca de dono (login, logout, expiração, outro usuário) limpa os dados privados;
 * - sessão expirada avisa e, em rota protegida, leva ao login guardando o destino;
 * - um timer encerra a sessão no horário de expiração, mesmo sem requisições;
 * - ao abrir o app, o token salvo é validado no servidor.
 */
export function startSessionSync(queryClient: QueryClient, router: AppRouter) {
  let ownerId = sessionStore.get()?.user.id ?? null
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  function scheduleExpiry() {
    clearTimeout(expiryTimer)
    const session = sessionStore.get()
    if (!session) return
    const ms = Date.parse(session.expiresAt) - Date.now()
    // setTimeout não aceita atrasos acima de ~24,8 dias; sessões são bem menores.
    expiryTimer = setTimeout(() => sessionStore.end('expired'), Math.max(ms, 0))
  }

  sessionStore.subscribe(() => {
    const nextOwner = sessionStore.get()?.user.id ?? null
    scheduleExpiry()
    if (nextOwner === ownerId) return
    ownerId = nextOwner
    clearPrivateData(queryClient)

    if (nextOwner !== null) return
    if (sessionStore.lastEndReason() !== 'expired') return

    if (isOnProtectedRoute(router)) {
      const { href } = router.state.location
      void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' }, replace: true })
    } else {
      toast.warning('Sua sessão expirou', { description: 'Entre novamente para acessar sua conta.' })
    }
  })

  scheduleExpiry()
  // Valida o token restaurado do storage; um 401 encerra a sessão pelo interceptor.
  if (sessionStore.get()) void fetchSession().catch(() => undefined)
}
