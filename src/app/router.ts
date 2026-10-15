import type { QueryClient } from '@tanstack/react-query'
import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

/** Dependências disponíveis em `beforeLoad` e `loader` de todas as rotas. */
export interface RouterContext {
  queryClient: QueryClient
  /**
   * Última página exibida que não exige login, para o modal de autenticação
   * abrir por cima dela quando uma rota protegida é acessada sem sessão.
   */
  getPublicBackgroundHref: () => string
}

export function createAppRouter(queryClient: QueryClient) {
  // Preenchida após criar o router: referenciá-lo no próprio inicializador
  // tornaria o tipo circular.
  let getPublicBackgroundHref = () => '/'

  const router = createRouter({
    routeTree,
    context: { queryClient, getPublicBackgroundHref: () => getPublicBackgroundHref() },
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

  getPublicBackgroundHref = () => {
    const resolved = router.state.resolvedLocation
    if (!resolved) return '/'
    const isProtected = router
      .matchRoutes(resolved)
      .some((match) => match.routeId.startsWith('/_authenticated'))
    return isProtected ? '/' : resolved.href
  }
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
