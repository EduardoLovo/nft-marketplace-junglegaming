import { Link, useRouterState } from '@tanstack/react-router'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { notAvailable } from '@/lib/not-available'
import { hidesMobileTabBar } from './mobile-layout'
import { TAB_BAR_NOTCH_PATH, TabCartIcon, TabHeartIcon, TabHomeIcon, TabScanIcon, TabUserIcon } from './tab-bar-icons'

/**
 * Itens do "Tab Bar" do Figma, com a posição (x, y) de cada ícone no frame de
 * 414px. Só ícones, sem rótulos visíveis: o nome vai no `aria-label`.
 */
const TABS = [
  { to: '/', label: 'Início', icon: TabHomeIcon, x: 36, y: 71, width: 20, height: 20, exact: true },
  { to: '/favorites', label: 'Lista de interesse', icon: TabHeartIcon, x: 108, y: 72, width: 20, height: 17.8, exact: false },
  { to: '/cart', label: 'Carrinho', icon: TabCartIcon, x: 292, y: 71, width: 20, height: 20, exact: false },
  { to: '/profile', label: 'Perfil', icon: TabUserIcon, x: 354, y: 71, width: 20, height: 20, exact: false },
] as const

/** Área de toque mínima em volta de cada ícone de 20px. */
const HIT = 44

/**
 * Barra de navegação inferior do mobile, como o "Tab Bar" do Figma: fundo com
 * recorte central, botão redondo em destaque e ícones nas posições originais.
 * Em telas mais largas que 414px as laterais do fundo esticam e os ícones
 * ficam centralizados.
 */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (hidesMobileTabBar(pathname)) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {/* Fundo: laterais com cantos de 29px + trecho central com o recorte. A
          sombra do Figma (0 -10 30 #0a0604/45%) acompanha o recorte via drop-shadow. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[31px] bottom-0 flex drop-shadow-[0_-10px_30px_rgb(10_6_4/0.45)]"
      >
        {/* As laterais avançam 1px sob o recorte para não sobrar emenda entre as peças. */}
        <div className="-mr-px flex-1 rounded-tl-[29px] bg-surface-card" />
        <svg viewBox="0 0 151.7 95" preserveAspectRatio="none" className="relative h-full w-[151.7px] shrink-0 text-surface-card">
          <path d={TAB_BAR_NOTCH_PATH} fill="currentColor" />
        </svg>
        <div className="-ml-px flex-1 rounded-tr-[29px] bg-surface-card" />
      </div>

      <div className="pointer-events-auto relative mx-auto h-[126px] w-[414px] max-w-full">
        <ul>
          {TABS.map(({ to, label, icon: Icon, x, y, width, height, exact }) => (
            <li key={to}>
              <Link
                to={to}
                aria-label={label}
                activeOptions={{ exact, includeHash: false }}
                style={{ left: x + width / 2 - HIT / 2, top: y + height / 2 - HIT / 2, width: HIT, height: HIT }}
                className="absolute flex items-center justify-center rounded-full text-text-secondary data-[status=active]:text-kurio-accent"
              >
                <span className="relative">
                  <Icon className="block" style={{ width, height }} />
                  {to === '/cart' && <CartCountBadge />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Botão central do Figma (ícone de escanear): fora do escopo do desafio. */}
        <button
          type="button"
          aria-label="Escanear"
          onClick={() => notAvailable('A leitura de QR code')}
          className="absolute top-0 left-[175px] flex size-[65px] items-center justify-center rounded-full bg-linear-to-b from-primary/40 to-primary text-foreground"
        >
          <TabScanIcon className="h-6 w-[26.8px]" />
        </button>
      </div>
    </nav>
  )
}
