import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'
import { startSessionSync } from './session-sync'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)
startSessionSync(queryClient, router)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
