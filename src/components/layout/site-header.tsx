import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { LoginLink } from '@/features/auth/components/login-link'
import { UserMenu } from '@/features/auth/components/user-menu'
import { useSession } from '@/features/auth/use-session'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { useCartCount } from '@/features/cart/hooks'
import { notAvailable } from '@/lib/not-available'
import { cn } from '@/lib/utils'
import { HeaderCartIcon, LoginIcon } from './header-icons'
import { HeaderSearch } from './header-search'
import { Logo } from './logo'

/** Rotas em que "Mercado" fica ativo no menu (variante "Active=Market" do Figma). */
const MARKET_PATHS = ['/nfts', '/cart', '/checkout', '/orders/']

function NavItem({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'relative flex h-[45px] flex-col text-base',
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
  const session = useSession()

  return (
    <header className="hidden lg:block">
      <div className="mx-auto flex h-[45px] max-w-content items-start justify-between border-b-[0.3px] border-primary">
        <div className="flex w-40 items-center pt-2">
          <Logo />
        </div>

        <nav aria-label="Principal">
          <ul className="flex gap-10">
            <li>
              <NavItem active={isHome}>
                <Link to="/" className={cn(linkClass, isHome && 'text-kurio-accent')} aria-current={isHome ? 'page' : undefined}>
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

        <div className="flex h-[35px] items-center gap-7">
          <HeaderSearch />
          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Carrinho, ${cartCount} itens` : 'Carrinho'}
            className="relative flex w-[31px] rounded-sm text-foreground hover:text-kurio-accent"
          >
            <HeaderCartIcon className="size-6" />
            <CartCountBadge />
          </Link>
          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <Button asChild className="h-[35px] w-[100px] gap-1 rounded-[6px] text-base leading-[21px] font-medium">
              <LoginLink>
                <LoginIcon className="size-5" />
                Entrar
              </LoginLink>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
