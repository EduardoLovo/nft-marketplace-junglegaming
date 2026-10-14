import type { QueryClient } from '@tanstack/react-query'
import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

/** Dependências disponíveis em `beforeLoad` e `loader` de todas as rotas. */
export interface RouterContext {
  queryClient: QueryClient
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // Pré-carrega a rota no hover/foco do link. O cache fica a cargo do
    // TanStack Query, por isso o cache próprio do router é desligado.
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Search params legíveis: valores ficam como texto (cada rota valida e
    // converte no `validateSearch`) e listas viram CSV (`?categories=a,b`)
    // em vez do JSON padrão (`?categories=%5B%22a%22%5D`).
    parseSearch: parseSearchWith((value) => value),
    stringifySearch: stringifySearchWith((value: unknown) =>
      Array.isArray(value) ? value.join(',') : JSON.stringify(value),
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
