import { Link, useRouterState } from '@tanstack/react-router'
import { LogInIcon, ShoppingCartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { useCartCount } from '@/features/cart/hooks'
import { notAvailable } from '@/lib/not-available'
import { cn } from '@/lib/utils'
import { HeaderSearch } from './header-search'
import { Logo } from './logo'

/** Rotas em que "Mercado" fica ativo no menu (variante "Active=Market" do Figma). */
const MARKET_PATHS = ['/nfts', '/cart', '/checkout', '/orders']

function NavItem({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'relative flex h-[46px] flex-col text-base',
        active ? 'font-bold' : 'font-normal',
        // Sublinhado do item ativo, alinhado à base do header como no layout.
        active && 'after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary',
      )}
    >
      {children}
    </span>
  )
}

const linkClass = 'rounded-sm leading-[21px] text-foreground hover:text-kurio-accent'

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isMarket = MARKET_PATHS.some((path) => pathname.startsWith(path))
  const isHome = pathname === '/'
  const cartCount = useCartCount()

  return (
    <header className="hidden border-b-[0.3px] border-primary lg:block">
      <div className="mx-auto flex h-[46px] max-w-content items-start justify-between">
        <div className="flex w-40 items-center pt-2">
          <Logo />
        </div>

        <nav aria-label="Principal">
          <ul className="flex gap-10">
            <li>
              <NavItem active={isHome}>
                <Link to="/" className={linkClass} aria-current={isHome ? 'page' : undefined}>
                  Início
                </Link>
              </NavItem>
            </li>
            <li>
              <NavItem active={isMarket}>
                <Link
                  to="/"
                  hash="mercado"
                  className={cn(linkClass, isMarket && 'text-kurio-accent')}
                  aria-current={isMarket ? 'page' : undefined}
                >
                  Mercado
                </Link>
              </NavItem>
            </li>
            <li>
              <NavItem active={false}>
                <button type="button" className={linkClass} onClick={() => notAvailable('A página de criadores')}>
                  Criadores
                </button>
              </NavItem>
            </li>
            <li>
              <NavItem active={false}>
                <button type="button" className={linkClass} onClick={() => notAvailable('A área Aprenda')}>
                  Aprenda
                </button>
              </NavItem>
            </li>
          </ul>
        </nav>

        <div className="flex h-[35px] items-center gap-5">
          <HeaderSearch />
          <Button asChild variant="ghost" size="icon" className="text-foreground">
            <Link to="/cart" aria-label={cartCount > 0 ? `Carrinho, ${cartCount} itens` : 'Carrinho'} className="relative">
              <ShoppingCartIcon className="size-6" />
              <CartCountBadge />
            </Link>
          </Button>
          <Button asChild className="h-[35px] w-[100px] gap-1 rounded-[6px] text-base font-medium">
            <Link to="/login">
              <LogInIcon className="size-5" />
              Entrar
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
