import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { sessionStore } from '@/lib/auth/session-store'
import { login, logout, signup } from './api'

/** Depois de entrar, o carrinho é recarregado: o servidor já mesclou o de visitante. */
function useStartSession() {
  const queryClient = useQueryClient()
  return (session: Parameters<typeof sessionStore.start>[0]) => {
    sessionStore.start(session)
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
  }
}

export function useLogin() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: login, onSuccess: startSession })
}

export function useSignup() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: signup, onSuccess: startSession })
}

export function useLogout() {
  return useMutation({
    mutationFn: logout,
    // A sessão local termina mesmo se o servidor falhar: sair nunca pode travar.
    onSettled: () => {
      sessionStore.end('logout')
      toast.success('Você saiu da sua conta.')
    },
  })
}

/** Logout que, numa rota protegida, leva para a home (a rota deixaria de ser acessível). */
export function useLogoutAndLeave() {
  const logout = useLogout()
  const router = useRouter()
  const onProtectedRoute = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId.startsWith('/_authenticated')),
  })
  return {
    isPending: logout.isPending,
    logout: () =>
      logout.mutate(undefined, {
        onSettled: () => {
          if (onProtectedRoute) void router.navigate({ to: '/' })
        },
      }),
  }
}
