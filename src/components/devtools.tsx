import { lazy, Suspense } from 'react'

// Carregados sob demanda e só em desenvolvimento: o `import.meta.env.DEV`
// é resolvido no build, então nada disso entra no bundle de produção. O build
// dos testes (modo e2e) usa o React de desenvolvimento, mas sem os devtools.
const ENABLED = import.meta.env.DEV && import.meta.env.MODE !== 'e2e'
const RouterDevtools = ENABLED
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

const QueryDevtools = ENABLED
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null

export function Devtools() {
  return (
    <Suspense>
      <RouterDevtools position="bottom-left" />
      <QueryDevtools buttonPosition="bottom-right" />
    </Suspense>
  )
}
