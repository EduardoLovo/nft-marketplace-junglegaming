import { useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts/catalog'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { useIsFavorite, useToggleFavorite } from '../api'

/**
 * Botão de favoritar. Sem sessão, leva ao login e volta para a mesma página
 * depois. `variant="icon"` é o coração redondo dos cards/mobile do Figma;
 * `variant="button"` é o "Favoritar" do detalhe no desktop.
 */
export function FavoriteButton({
  nft,
  variant = 'icon',
  className,
}: {
  nft: NftSummary
  variant?: 'icon' | 'button'
  className?: string
}) {
  const session = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const favorite = useIsFavorite(nft.id)
  const toggle = useToggleFavorite()

  function onClick() {
    if (!session) {
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate({ nft, favorite: !favorite })
  }

  const label = favorite ? `Remover ${nft.name} da lista de interesse` : `Favoritar ${nft.name}`

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={favorite}
        aria-label={label}
        className={cn(
          'flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-primary text-sm font-medium text-primary uppercase transition-colors hover:bg-primary/10',
          favorite && 'bg-primary/15',
          className,
        )}
      >
        <HeartIcon className={cn('size-5', favorite && 'fill-current')} aria-hidden="true" />
        {favorite ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorite}
      aria-label={label}
      className={cn(
        'relative z-10 flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:text-primary',
        favorite && 'text-primary',
        className,
      )}
    >
      <HeartIcon className={cn('size-[18px]', favorite && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
