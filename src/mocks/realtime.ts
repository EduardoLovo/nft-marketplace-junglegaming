import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdatedEvent, OrderUpdatedEvent, ServerEvent } from '@/contracts/realtime'
import { SOCKET_PATH, SOCKET_UNAUTHORIZED_CODE } from '@/contracts/realtime'
import { db } from './db'
import { randomToken } from './domain/auth'
import type { NftRecord } from './fixtures/nfts'

/**
 * Servidor Socket.IO simulado sobre o suporte a WebSocket do MSW, com o
 * `@mswjs/socket.io-binding` codificando o protocolo. Limitações (documentadas
 * no ARCHITECTURE.md): só o transporte WebSocket (sem long-polling), sem
 * namespaces/rooms (o roteamento por usuário é feito aqui) e heartbeat manual.
 */

interface ClientConnection {
  userId: string | null
  emit: (event: string, payload: unknown) => void
  close: () => void
}

const connections = new Set<ClientConnection>()
/** Últimos eventos enviados, para os controles de teste reenviarem (duplicados/antigos). */
const recentEvents: Array<{ event: ServerEvent; userId: string | null }> = []

const HEARTBEAT_MS = 20_000

function socketUrl() {
  const url = new URL(import.meta.env.VITE_SOCKET_URL ?? window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${url.origin}${SOCKET_PATH}/*`
}

const socketLink = ws.link(socketUrl())

export const realtimeHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    // O token chega na query da URL. Visitantes conectam sem token e recebem só eventos públicos.
    const token = new URL(connection.client.url).searchParams.get('token')
    let userId: string | null = null
    if (token) {
      const session = db.state.sessions[token]
      if (!session || Date.parse(session.expiresAt) <= Date.now()) {
        connection.client.close(SOCKET_UNAUTHORIZED_CODE, 'Sessão inválida ou expirada')
        return
      }
      userId = session.userId
    }

    const io = toSocketIo(connection)
    // O binding responde o handshake, mas não envia pings: sem eles o cliente
    // fecharia a conexão por "ping timeout". "2" é o ping do Engine.IO.
    const heartbeat = setInterval(() => connection.client.send('2'), HEARTBEAT_MS)

    const client: ClientConnection = {
      userId,
      emit: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(),
    }
    connections.add(client)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      connections.delete(client)
    })
  }),
]

/** Envia o evento a todos (público) ou só às conexões de um usuário (privado). */
function publish(event: ServerEvent, userId: string | null = null, remember = true) {
  if (remember) {
    recentEvents.push({ event, userId })
    if (recentEvents.length > 50) recentEvents.shift()
  }
  for (const client of connections) {
    if (userId === null || client.userId === userId) client.emit(event.type, event)
  }
}

export function publishNftUpdated(nft: NftRecord) {
  const event: NftUpdatedEvent = {
    id: `evt_${randomToken(8)}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      priceEth: nft.priceEth,
      status: nft.status,
      editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available })),
    },
  }
  publish(event)
}

export function publishOrderUpdated(order: {
  id: string
  userId: string
  version: number
  status: OrderUpdatedEvent['data']['status']
  txHash: string | null
  rejectionReason: string | null
}) {
  const event: OrderUpdatedEvent = {
    id: `evt_${randomToken(8)}`,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: { status: order.status, txHash: order.txHash, rejectionReason: order.rejectionReason },
  }
  publish(event, order.userId)
}

/** Controles de teste: reenviar o último evento (duplicado) ou uma versão antiga dele. */
export function replayLastEvent({ stale = false } = {}) {
  const last = recentEvents.at(-1)
  if (!last) return null
  const event = stale ? { ...last.event, id: `evt_${randomToken(8)}`, version: last.event.version - 1 } : last.event
  publish(event as ServerEvent, last.userId, false)
  return event
}

/** Derruba todas as conexões, simulando perda de rede; o cliente reconecta sozinho. */
export function dropConnections() {
  for (const client of [...connections]) client.close()
}

export const activeConnections = () => connections.size
