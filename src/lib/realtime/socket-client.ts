import type { Socket } from 'socket.io-client'
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
 *
 * O socket.io-client é importado só aqui, ao conectar: ele guarda a referência
 * do `WebSocket` global ao carregar, e ela precisa ser a já interceptada pelo
 * MSW. Isso permite baixar o resto do app em paralelo com o worker (main.tsx).
 */
export function createRealtimeConnection(token: string | null, handlers: Handlers) {
  let socket: Socket | null = null
  let closed = false
  handlers.onStatus('connecting')

  void import('socket.io-client').then(({ io }) => {
    if (closed) return
    socket = open(io, token, handlers)
  })

  return {
    close() {
      closed = true
      if (!socket) return
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
    },
  }
}

function open(io: typeof import('socket.io-client').io, token: string | null, handlers: Handlers): Socket {
  const socket: Socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
    path: SOCKET_PATH,
    // O MSW intercepta só WebSocket: sem fallback para long-polling.
    transports: ['websocket'],
    query: token ? { token } : {},
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
  })

  let hasConnected = false

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

  return socket
}
