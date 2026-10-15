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

// O app baixa em paralelo com o worker do MSW (o socket.io-client só é
// carregado ao conectar, já com o `WebSocket` interceptado). A renderização
// espera o worker: nenhuma requisição escapa dos mocks.
const [, { App }] = await Promise.all([enableMocking(), import('@/app/app')])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
