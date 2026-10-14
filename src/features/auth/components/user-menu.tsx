import { Link } from '@tanstack/react-router'
import { ChevronDownIcon, LogOutIcon, UserIcon, WalletIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/contracts/auth'
import { cn } from '@/lib/utils'
import { useLogoutAndLeave } from '../hooks'

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={cn('size-8 rounded-full object-cover', className)} />
  ) : (
    <span
      aria-hidden="true"
      className={cn('flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-ink', className)}
    >
      {initials}
    </span>
  )
}

export function UserMenu({ user }: { user: User }) {
  const { logout, isPending } = useLogoutAndLeave()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.name}`}
        className="flex items-center gap-2 rounded-full py-0.5 pr-1 pl-0.5 hover:bg-surface-raised focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <UserAvatar user={user} />
        <span className="max-w-28 truncate text-sm font-medium">{user.name.split(' ')[0]}</span>
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-bold">{user.name}</span>
          <span className="truncate text-xs font-normal text-text-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon aria-hidden="true" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets">
            <WalletIcon aria-hidden="true" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={logout}>
          <LogOutIcon aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
