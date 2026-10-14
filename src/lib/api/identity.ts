/**
 * Identidade enviada em cada requisição. Por enquanto, só o carrinho de
 * visitante: um id aleatório gerado no navegador, que mantém o carrinho
 * entre refreshes sem exigir login.
 */

const CART_ID_KEY = 'kurio:cart-id'

let memoryCartId: string | null = null

function generateId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Id do carrinho de visitante; criado na primeira chamada. */
export function getGuestCartId(): string {
  try {
    const stored = localStorage.getItem(CART_ID_KEY)
    if (stored) return stored
    const id = generateId()
    localStorage.setItem(CART_ID_KEY, id)
    return id
  } catch {
    // Sem storage, o carrinho vale enquanto a aba estiver aberta.
    memoryCartId ??= generateId()
    return memoryCartId
  }
}
