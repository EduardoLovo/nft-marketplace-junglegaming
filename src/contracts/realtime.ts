import type { EthAmount } from '@/lib/eth'
import type { NftStatus } from './catalog'
import type { OrderStatus } from './checkout'
import type { IsoDateTime } from './common'

/**
 * Envelope comum dos eventos Socket.IO. `id` é estável (o mesmo evento
 * reenviado tem o mesmo id) e `version` é a versão do recurso após a
 * mudança: o cliente descarta duplicados e eventos mais antigos que o que
 * já tem, sem regredir o estado.
 */
export interface RealtimeEvent<TType extends string, TResource extends string, TData> {
  id: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: IsoDateTime
  data: TData
}

/** Preço e disponibilidade de um NFT mudaram (catálogo, detalhe e carrinho). */
export type NftUpdatedEvent = RealtimeEvent<
  'nft.updated',
  'nft',
  {
    priceEth: EthAmount
    status: NftStatus
    editions: Array<{ id: string; priceEth: EthAmount; available: number | null }>
  }
>

/** O status de um pedido mudou. Enviado apenas às conexões do dono do pedido. */
export type OrderUpdatedEvent = RealtimeEvent<
  'order.updated',
  'order',
  {
    status: OrderStatus
    txHash: string | null
    rejectionReason: string | null
  }
>

export type ServerEvent = NftUpdatedEvent | OrderUpdatedEvent

/** Nomes dos eventos no Socket.IO (iguais ao `type` do envelope). */
export const SOCKET_EVENTS = ['nft.updated', 'order.updated'] as const

/**
 * Caminho do Socket.IO. Não usa o padrão `/socket.io`: o MSW remove esse
 * prefixo da URL antes de comparar com o handler, o que faria o handler
 * coincidir com `/`, onde também conecta o WebSocket do HMR do Vite.
 */
export const SOCKET_PATH = '/realtime'

/** Código de fechamento quando o token da conexão é inválido ou expirou. */
export const SOCKET_UNAUTHORIZED_CODE = 4401
