import { lazy, Suspense } from 'react'

// Carregados sob demanda e só em desenvolvimento: o `import.meta.env.DEV`
// é resolvido no build, então nada disso entra no bundle de produção.
const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

const QueryDevtools = import.meta.env.DEV
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
