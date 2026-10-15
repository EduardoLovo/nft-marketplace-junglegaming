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

// O app baixa em paralelo com o worker do MSW, mas só é iniciado (sessão,
// Socket.IO e renderização) depois dele: nenhuma requisição escapa dos mocks.
const [, { createApp }] = await Promise.all([enableMocking(), import('@/app/app')])
const App = createApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
