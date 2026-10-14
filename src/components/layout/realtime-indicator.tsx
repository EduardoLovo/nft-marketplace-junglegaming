import { WifiOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRealtimeStatus } from '@/lib/realtime/realtime-store'

/** Só aparece se a queda durar mais que isso: reconexões rápidas não piscam na tela. */
const SHOW_AFTER_MS = 2_000

/**
 * Aviso discreto de que o tempo real caiu. Os dados continuam funcionando
 * pela API; ao reconectar, tudo o que está na tela é revalidado.
 */
export function RealtimeIndicator() {
  const status = useRealtimeStatus()
  const disconnected = status === 'reconnecting' || status === 'offline'
  const [delayElapsed, setDelayElapsed] = useState(false)
  const visible = disconnected && delayElapsed

  useEffect(() => {
    if (!disconnected) return
    const timer = setTimeout(() => setDelayElapsed(true), SHOW_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setDelayElapsed(false)
    }
  }, [disconnected])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
      {visible && (
        <p className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-card px-4 py-2 text-xs shadow-lg">
          <WifiOffIcon className="size-4 text-amber" aria-hidden="true" />
          {status === 'offline' ? 'Você está offline. Atualizações ao vivo pausadas.' : 'Reconectando às atualizações ao vivo…'}
        </p>
      )}
    </div>
  )
}
