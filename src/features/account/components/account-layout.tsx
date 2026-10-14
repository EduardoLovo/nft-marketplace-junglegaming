import { Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  DownloadIcon,
  HandCoinsIcon,
  HeartIcon,
  LifeBuoyIcon,
  LogOutIcon,
  ReceiptIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useLogoutAndLeave } from '@/features/auth/hooks'
import { notAvailable } from '@/lib/not-available'
import { cn } from '@/lib/utils'

const itemClass =
  'flex h-[45px] w-full items-center gap-3 rounded-sm border border-transparent px-4 text-[15px] text-kurio-accent hover:bg-surface-raised'

/** Itens do Figma fora do escopo do desafio: aparecem, mas avisam a indisponibilidade. */
const UNAVAILABLE: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Atividade', icon: ActivityIcon },
  { label: 'Ofertas', icon: HandCoinsIcon },
  { label: 'Downloads', icon: DownloadIcon },
  { label: 'Suporte', icon: LifeBuoyIcon },
]

/** Estrutura das páginas da conta: barra lateral "Meu perfil" + conteúdo. */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const { logout, isPending } = useLogoutAndLeave()

  return (
    <div className="flex flex-col gap-6 pt-2 lg:flex-row lg:gap-7 lg:pt-8">
      <aside aria-labelledby="account-nav-title" className="w-full shrink-0 bg-surface-card py-2 lg:w-[310px] lg:self-start">
        <h2 id="account-nav-title" className="px-4 py-2.5 text-lg font-bold">
          Meu perfil
        </h2>
        <nav aria-labelledby="account-nav-title">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1">
            <li>
              <Link
                to="/profile"
                className={itemClass}
                activeProps={{ className: 'border-primary!', 'aria-current': 'page' }}
              >
                <UserIcon className="size-[18px]" aria-hidden="true" />
                Dados do perfil
              </Link>
            </li>
            <li>
              <Link
                to="/wallets"
                className={itemClass}
                activeProps={{ className: 'border-primary!', 'aria-current': 'page' }}
              >
                <WalletIcon className="size-[18px]" aria-hidden="true" />
                Carteiras
              </Link>
            </li>
            <li>
              <Link
                to="/orders"
                className={itemClass}
                activeProps={{ className: 'border-primary!', 'aria-current': 'page' }}
              >
                <ReceiptIcon className="size-[18px]" aria-hidden="true" />
                Meus pedidos
              </Link>
            </li>
            <li>
              <Link
                to="/favorites"
                className={itemClass}
                activeProps={{ className: 'border-primary!', 'aria-current': 'page' }}
              >
                <HeartIcon className="size-[18px]" aria-hidden="true" />
                Lista de interesse
              </Link>
            </li>
            {UNAVAILABLE.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button type="button" className={itemClass} onClick={() => notAvailable(`A seção ${label}`)}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={cn(itemClass, 'text-coral')} onClick={logout} disabled={isPending}>
                <LogOutIcon className="size-[18px]" aria-hidden="true" />
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <section aria-labelledby="account-title" className="flex min-w-0 flex-1 flex-col gap-6">
        <h1 id="account-title" className="text-[17px] font-bold">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
