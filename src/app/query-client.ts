import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api/errors'

const MAX_QUERY_RETRIES = 2

/**
 * Política padrão de cache e retry (detalhada no ARCHITECTURE.md):
 * - Queries ficam frescas por 30s e são revalidadas em segundo plano ao
 *   voltar o foco à janela ou reconectar.
 * - Só falhas transitórias (rede, timeout, 429, 5xx) são repetidas, com
 *   backoff exponencial. Um 4xx não muda numa nova tentativa.
 * - Mutations não são repetidas automaticamente: repetir uma escrita só é
 *   seguro quando ela é idempotente, e cada mutation decide isso.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES && isApiError(error) && error.isTransient,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
