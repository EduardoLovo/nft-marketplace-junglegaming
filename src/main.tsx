import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
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

// O render espera o worker para nenhuma requisição escapar dos mocks.
await enableMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
