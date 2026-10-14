import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart } from '@/contracts/cart'
import type { CatalogPage, NftDetail } from '@/contracts/catalog'
import type { Order } from '@/contracts/checkout'
import { isTerminalStatus } from '@/contracts/checkout'
import type { NftUpdatedEvent, OrderUpdatedEvent, ServerEvent } from '@/contracts/realtime'
import { cartKeys } from '@/features/cart/api'
import { catalogKeys } from '@/features/catalog/api'
import { orderKeys } from '@/features/checkout/api'
import { sessionStore } from '@/lib/auth/session-store'
import { realtimeStore } from '@/lib/realtime/realtime-store'
import { createRealtimeConnection } from '@/lib/realtime/socket-client'
import type { createAppRouter } from './router'

type AppRouter = ReturnType<typeof createAppRouter>

const MAX_SEEN_EVENTS = 500

/**
 * Aplica os eventos Socket.IO no cache do TanStack Query:
 * - descarta duplicados (mesmo `id`) e eventos antigos (`version` menor ou
 *   igual à já aplicada ou à do cache), então o estado nunca regride;
 * - `nft.updated` atualiza detalhe e listagens no lugar e revalida o carrinho
 *   que contém o NFT, avisando o usuário;
 * - `order.updated` atualiza o pedido do usuário atual e, ao concluir,
 *   revalida carrinho e catálogo;
 * - ao reconectar, revalida com a API REST tudo o que está na tela, porque
 *   eventos podem ter sido perdidos durante a queda;
 * - cada sessão tem sua conexão: trocar de usuário fecha a anterior.
 */
export function startRealtimeSync(queryClient: QueryClient, router: AppRouter) {
  let connection: ReturnType<typeof createRealtimeConnection> | null = null
  let currentToken: string | null | undefined
  const seenEvents = new Set<string>()
  const appliedVersions = new Map<string, number>()

  const owner = () => sessionStore.get()?.user.id ?? 'guest'

  /** Primeira vez que vemos esta versão do recurso? Registra e responde. */
  function accept(event: ServerEvent) {
    if (seenEvents.has(event.id)) return false
    seenEvents.add(event.id)
    if (seenEvents.size > MAX_SEEN_EVENTS) seenEvents.delete(seenEvents.values().next().value!)

    const key = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (appliedVersions.get(key) ?? 0)) return false
    appliedVersions.set(key, event.version)
    return true
  }

  function applyNftUpdated(event: NftUpdatedEvent) {
    const { id } = event.resource
    const { priceEth, status, editions } = event.data
    const patchEditions = (detail: NftDetail) =>
      detail.editions.map((edition) => {
        const update = editions.find((e) => e.id === edition.id)
        return update ? { ...edition, priceEth: update.priceEth, available: update.available } : edition
      })

    queryClient.setQueryData<NftDetail>(catalogKeys.detail(id), (detail) =>
      detail && detail.version < event.version
        ? { ...detail, priceEth, status, version: event.version, editions: patchEditions(detail) }
        : detail,
    )
    queryClient.setQueriesData<CatalogPage>({ queryKey: catalogKeys.lists() }, (page) =>
      page && {
        ...page,
        items: page.items.map((item) =>
          item.id === id && item.version < event.version ? { ...item, priceEth, status, version: event.version } : item,
        ),
      },
    )
    // Filtros e ordenação por preço podem ter mudado: as listas são refeitas na próxima exibição.
    void queryClient.invalidateQueries({ queryKey: catalogKeys.lists(), refetchType: 'none' })

    const cart = queryClient.getQueryData<Cart>(cartKeys.detail(owner()))
    const cartItem = cart?.items.find((item) => item.nftId === id)
    if (cartItem) {
      void queryClient.invalidateQueries({ queryKey: cartKeys.detail(owner()) })
      toast.info(`${cartItem.name} mudou no seu carrinho`, {
        id: `cart-change-${id}`,
        description: 'Preço ou disponibilidade foram atualizados. Confira o resumo.',
      })
    }
    realtimeStore.emitNftUpdated(event)
  }

  function applyOrderUpdated(event: OrderUpdatedEvent) {
    const { id } = event.resource
    const key = orderKeys.detail(owner(), id)
    const cached = queryClient.getQueryData<Order>(key)
    if (cached && cached.version < event.version) {
      queryClient.setQueryData<Order>(key, {
        ...cached,
        ...event.data,
        version: event.version,
        updatedAt: event.occurredAt,
      })
    }
    void queryClient.invalidateQueries({ queryKey: orderKeys.list(owner()) })

    if (!isTerminalStatus(event.data.status)) return
    void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    // Fora da página do pedido, avisa o resultado com atalho para ela.
    if (router.state.location.pathname !== `/orders/${id}`) {
      const confirmed = event.data.status === 'confirmed'
      toast[confirmed ? 'success' : 'error'](confirmed ? 'Pedido confirmado' : 'Pagamento recusado', {
        id: `order-${id}`,
        description: confirmed ? 'Seus NFTs já estão na sua carteira.' : event.data.rejectionReason ?? undefined,
        action: {
          label: 'Ver pedido',
          onClick: () => void router.navigate({ to: '/orders/$orderId', params: { orderId: id } }),
        },
      })
    }
  }

  function reconcile() {
    // Eventos perdidos durante a queda: a API é a fonte da verdade.
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all, refetchType: 'active' })
    void queryClient.invalidateQueries({ queryKey: cartKeys.all, refetchType: 'active' })
    void queryClient.invalidateQueries({ queryKey: orderKeys.all, refetchType: 'active' })
  }

  function open() {
    const token = sessionStore.get()?.token ?? null
    if (token === currentToken) return
    currentToken = token
    connection?.close()
    seenEvents.clear()
    appliedVersions.clear()
    connection = createRealtimeConnection(token, {
      onStatus: realtimeStore.setStatus,
      onReconnect: reconcile,
      onEvent: (event) => {
        if (!accept(event)) return
        if (event.type === 'nft.updated') applyNftUpdated(event)
        else applyOrderUpdated(event)
      },
    })
  }

  sessionStore.subscribe(open)
  open()
}
