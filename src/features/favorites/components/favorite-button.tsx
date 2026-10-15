import { HeartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts/catalog'
import { useAuthModal } from '@/features/auth/auth-modal'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { useIsFavorite, useToggleFavorite } from '../api'

/**
 * Botão de favoritar. Sem sessão, abre o modal de login sobre a página atual. `variant="icon"` é o coração redondo dos cards/mobile do Figma;
 * `variant="button"` é o "Favoritar" do detalhe no desktop e `variant="mini"`
 * o círculo de 28px com coração cobre dos cards mobile; `variant="circle"` é o
 * de 35px sobre a arte no detalhe mobile.
 */
export function FavoriteButton({
  nft,
  variant = 'icon',
  className,
}: {
  nft: NftSummary
  variant?: 'icon' | 'mini' | 'circle' | 'button'
  className?: string
}) {
  const session = useSession()
  const authModal = useAuthModal()
  const favorite = useIsFavorite(nft.id)
  const toggle = useToggleFavorite()

  function onClick() {
    if (!session) {
      authModal.open('login')
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

  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={favorite}
        aria-label={label}
        className={cn(
          'flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-kurio-accent',
          className,
        )}
      >
        <HeartIcon className={cn('h-[14.2px] w-4', favorite && 'fill-current')} aria-hidden="true" />
      </button>
    )
  }

  if (variant === 'mini') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={favorite}
        aria-label={label}
        className={cn(
          'relative z-10 flex size-7 items-center justify-center rounded-full border border-border bg-surface-raised text-primary',
          className,
        )}
      >
        {/* Preenchido quando favoritado; contorno quando não, para o estado ser visível. */}
        <HeartIcon className={cn('h-[13.3px] w-[15px]', favorite && 'fill-current')} aria-hidden="true" />
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
