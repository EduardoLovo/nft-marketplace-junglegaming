import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLogoutAndLeave } from '@/features/auth/hooks'
import { notAvailable } from '@/lib/not-available'
import {
  ActivityIcon,
  DownloadsIcon,
  LogoutIcon,
  OffersIcon,
  ProfileIcon,
  SupportIcon,
  WalletsIcon,
  WatchlistIcon,
} from './account-icons'

/** Item do "Account Sidebar" do Figma: 45px, texto accent, ícone secundário e borda cobre quando ativo. */
const itemClass =
  'flex h-[45px] w-full items-center gap-3 border border-transparent px-4 text-[15px] leading-[45px] whitespace-nowrap text-kurio-accent hover:bg-surface-raised'
const iconClass = 'size-[18px] shrink-0 text-kurio-secondary'

const LINKS = [
  { to: '/profile', label: 'Dados do perfil', icon: ProfileIcon },
  { to: '/wallets', label: 'Carteiras', icon: WalletsIcon },
  // "Atividade" do Figma: o histórico de pedidos da conta.
  { to: '/orders', label: 'Atividade', icon: ActivityIcon },
  { to: '/favorites', label: 'Lista de interesse', icon: WatchlistIcon },
] as const

/** Itens do Figma fora do escopo do desafio: aparecem, mas avisam a indisponibilidade. */
const UNAVAILABLE = [
  { label: 'Ofertas', icon: OffersIcon },
  { label: 'Arquivos baixados', icon: DownloadsIcon },
  { label: 'Suporte', icon: SupportIcon },
]

/**
 * Estrutura das páginas da conta: barra lateral "Meu perfil" de 310px e o
 * conteúdo 28px à direita, com o título de 16px do Figma.
 */
export function AccountLayout({
  title,
  actions,
  description,
  children,
}: {
  title: string
  /** Ação à direita do título (ex.: "Adicionar" em Carteiras). */
  actions?: ReactNode
  /** Linha de apoio 8px abaixo do título. */
  description?: string
  children: ReactNode
}) {
  const { logout, isPending } = useLogoutAndLeave()

  return (
    <div className="flex flex-col gap-6 pt-2 lg:flex-row lg:gap-7 lg:pt-8">
      <aside aria-labelledby="account-nav-title" className="w-full shrink-0 bg-surface-card py-2 lg:w-[310px] lg:self-start">
        <h2 id="account-nav-title" className="p-2.5 text-lg leading-4 font-bold">
          Meu perfil
        </h2>
        <nav aria-labelledby="account-nav-title">
          {/* Sem frame mobile no Figma: no mobile os itens viram uma faixa com rolagem horizontal. */}
          <ul className="flex overflow-x-auto lg:flex-col lg:overflow-visible">
            {LINKS.map(({ to, label, icon: Icon }) => (
              <li key={to} className="shrink-0">
                <Link to={to} className={itemClass} activeProps={{ className: 'border-primary!', 'aria-current': 'page' }}>
                  <Icon className={iconClass} />
                  {label}
                </Link>
              </li>
            ))}
            {UNAVAILABLE.map(({ label, icon: Icon }) => (
              <li key={label} className="shrink-0">
                <button type="button" className={itemClass} onClick={() => notAvailable(`A seção ${label}`)}>
                  <Icon className={iconClass} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={logout}
            disabled={isPending}
            className="flex h-10 w-full items-center gap-2 border-t-[0.3px] border-primary px-4 text-[15px] leading-[15px] font-bold text-kurio-accent hover:bg-surface-raised"
          >
            <LogoutIcon className="size-5 text-kurio-secondary" />
            Sair
          </button>
        </nav>
      </aside>

      <section aria-labelledby="account-title" className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 id="account-title" className="text-base leading-4 font-bold">
              {title}
            </h1>
            {actions}
          </div>
          {description && <p className="text-sm leading-[15px] text-text-secondary">{description}</p>}
        </div>
        {children}
      </section>
    </div>
  )
}
