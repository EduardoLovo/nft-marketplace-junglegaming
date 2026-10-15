import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from './query-client'
import { startRealtimeSync } from './realtime-sync'
import { createAppRouter } from './router'
import { startSessionSync } from './session-sync'

/**
 * Cria o cliente de cache e o router e liga as sincronias de sessão e de tempo
 * real. Fica numa função, e não no topo do módulo, porque o módulo é baixado em
 * paralelo com o worker do MSW (main.tsx): só pode rodar depois do worker
 * ativo, senão a validação da sessão e o Socket.IO escapam dos mocks.
 */
export function createApp() {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  startSessionSync(queryClient, router)
  startRealtimeSync(queryClient, router)

  return function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
  }
}
