import { io, type Socket } from 'socket.io-client'
import { SOCKET_EVENTS, SOCKET_PATH, type ServerEvent } from '@/contracts/realtime'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

interface Handlers {
  onEvent: (event: ServerEvent) => void
  /** Chamado ao reconectar após uma queda: hora de reconciliar com a API. */
  onReconnect: () => void
  onStatus: (status: RealtimeStatus) => void
}

/**
 * Uma conexão Socket.IO por sessão. Trocar de usuário (ou sair) encerra a
 * conexão atual e abre outra: listeners e eventos da sessão anterior nunca
 * alcançam a nova.
 */
export function createRealtimeConnection(token: string | null, handlers: Handlers) {
  const socket: Socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
    path: SOCKET_PATH,
    // O MSW intercepta só WebSocket: sem fallback para long-polling.
    transports: ['websocket'],
    query: token ? { token } : {},
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
  })

  let hasConnected = false
  handlers.onStatus('connecting')

  socket.on('connect', () => {
    handlers.onStatus('connected')
    if (hasConnected) handlers.onReconnect()
    hasConnected = true
  })
  socket.on('disconnect', () => handlers.onStatus(navigator.onLine ? 'reconnecting' : 'offline'))
  socket.io.on('reconnect_attempt', () => handlers.onStatus('reconnecting'))
  socket.on('connect_error', () => handlers.onStatus(navigator.onLine ? 'reconnecting' : 'offline'))

  for (const eventName of SOCKET_EVENTS) {
    socket.on(eventName, (event: ServerEvent) => handlers.onEvent(event))
  }

  return {
    close() {
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
    },
  }
}
