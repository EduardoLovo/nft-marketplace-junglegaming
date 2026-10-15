/**
 * Telas mobile do Figma sem o menu: detalhe (barra de compra), carrinho e
 * pagamento (resumo fixo no rodapé). Nas demais o menu continua.
 */
const PATHS_WITH_ACTION_BAR = ['/nfts/', '/cart', '/checkout']

/** Se a tela esconde o menu inferior do mobile. */
export function hidesMobileTabBar(pathname: string) {
  return PATHS_WITH_ACTION_BAR.some((path) => pathname.startsWith(path))
}

/**
 * Espaço no fim da página mobile para nada ficar escondido sob o que é fixo no
 * rodapé: a barra de compra do detalhe (166px), o resumo do carrinho (altura
 * medida em `--cart-summary-height`) ou o menu (126px).
 */
export function mobileBottomSpaceClass(pathname: string) {
  if (pathname.startsWith('/nfts/')) return 'pb-44'
  if (pathname.startsWith('/cart')) return 'pb-[calc(var(--cart-summary-height,0px)+1.5rem)]'
  if (hidesMobileTabBar(pathname)) return 'pb-6'
  return 'pb-36'
}
