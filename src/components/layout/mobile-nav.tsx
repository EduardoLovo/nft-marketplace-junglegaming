import { Link, useRouterState } from '@tanstack/react-router'
import { HomeIcon, LogInIcon, ShoppingCartIcon, UserIcon, WalletIcon } from 'lucide-react'
import { Logo } from './logo'

/**
 * Topo compacto para telas menores que `lg`. O Figma mobile não tem header;
 * a marca e o acesso à conta foram mantidos aqui para não sumirem no mobile.
 */
export function MobileTopBar() {
  return (
    <div className="flex h-14 items-center justify-between lg:hidden">
      <Logo />
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-kurio-accent"
      >
        <LogInIcon className="size-4" aria-hidden="true" />
        Entrar
      </Link>
    </div>
  )
}

const TABS = [
  { to: '/', label: 'Início', icon: HomeIcon, exact: true },
  { to: '/cart', label: 'Carrinho', icon: ShoppingCartIcon, exact: false },
  { to: '/wallets', label: 'Carteiras', icon: WalletIcon, exact: false },
  { to: '/profile', label: 'Perfil', icon: UserIcon, exact: false },
] as const

/** Rotas com barra de ação própria no rodapé do mobile (ex.: comprar no detalhe). */
const PATHS_WITH_ACTION_BAR = ['/nfts/']

/** Barra de navegação inferior do mobile, como no Figma. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (PATHS_WITH_ACTION_BAR.some((path) => pathname.startsWith(path))) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink-soft/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact, includeHash: false }}
              className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-muted data-[status=active]:text-primary"
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
