import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

/**
 * Os mocks ficam ativos por padrão, inclusive no build de demonstração,
 * porque não existe backend real. `VITE_ENABLE_MOCKS=false` os desliga.
 * O import dinâmico mantém o MSW fora do bundle quando desligado.
 */
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker()
}

// O app é importado só depois do MSW: o socket.io-client guarda a referência
// do `WebSocket` global ao carregar, e ela precisa ser a já interceptada.
// Esperar o worker também garante que nenhuma requisição escape dos mocks.
await enableMocking()
const { App } = await import('@/app/app')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
