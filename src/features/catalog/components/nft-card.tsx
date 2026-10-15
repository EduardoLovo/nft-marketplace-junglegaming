import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { NftSummary } from '@/contracts/catalog'
import { formatEth } from '@/lib/eth'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'

/** Larguras reais do card em cada breakpoint, para o navegador escolher a imagem certa. */
const CARD_IMAGE_SIZES = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw'

interface NftCardProps {
  nft: NftSummary
  /** Primeiros cards visíveis: carregamento imediato para não atrasar o LCP. */
  priority?: boolean
  /**
   * Cards de 219px do Figma: `true` no "Mais desta coleção" (nome e preço
   * colados) e 'loose' no "Colecionadores também viram" (8px entre arte, nome e preço).
   */
  compact?: boolean | 'loose'
}

export function NftCard({ nft, priority = false, compact = false }: NftCardProps) {
  const soldOut = nft.status === 'sold-out'

  return (
    <article className={cn('group relative flex flex-col gap-2', compact === 'loose' ? 'lg:gap-2' : 'lg:gap-3')}>
      <div
        className={cn(
          'relative flex aspect-[175/200] items-start justify-center rounded-[20px] bg-linear-to-b from-surface-card to-surface-raised pt-3 in-data-[col=right]:pt-5 md:items-center md:pt-0 md:in-data-[col=right]:pt-0 lg:aspect-[258/300] lg:items-start lg:rounded-none lg:bg-surface-card lg:bg-none',
          compact ? 'lg:pt-5' : 'lg:pt-6 lg:in-data-[col=right]:pt-6',
        )}
      >
        <img
          src={nft.image.src}
          srcSet={nft.image.srcSet}
          sizes={CARD_IMAGE_SIZES}
          width={nft.image.width}
          height={nft.image.height}
          alt={nft.image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={`aspect-square w-[96%] rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] lg:w-[96.9%] ${compact ? 'lg:rounded-[13px]' : 'lg:rounded-[15px]'}`}
        />
        {/* Coração dos cards no mobile (Figma); fica acima do link que cobre o card. */}
        <FavoriteButton nft={nft} variant="mini" className="absolute top-3 right-[11px] lg:hidden" />
        <div className="absolute top-4 left-0 flex flex-col items-start gap-1.5 lg:top-3 lg:left-3">
          {nft.isRare && (
            <span className="flex h-8 w-[68px] items-center bg-primary px-2 text-[13px] font-medium uppercase text-ink lg:h-auto lg:w-auto lg:rounded-sm lg:py-1">
              Raro
            </span>
          )}
          {soldOut && (
            <span className="rounded-sm border border-border-strong bg-ink/90 px-2 py-1 text-[13px] font-medium uppercase text-foreground">
              Esgotado
            </span>
          )}
        </div>
      </div>
      <div className={cn('flex flex-col px-2 lg:px-0', compact === 'loose' ? 'lg:gap-2' : !compact && 'md:gap-1.5')}>
        <h3 className={`truncate text-[15px] leading-5 ${compact ? '' : 'lg:text-base lg:leading-4'}`}>
          {/* O link cobre o card inteiro, mas o nome é o seu texto acessível. */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="rounded-sm after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring lg:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className={`text-base leading-4 font-bold text-primary ${compact ? '' : 'lg:text-lg'}`}>
          <span className="sr-only">{soldOut ? 'Esgotado. Último preço: ' : 'Preço: '}</span>
          {formatEth(nft.priceEth)}
        </p>
      </div>
    </article>
  )
}

/** Mesmas dimensões do card real, para a grade não pular quando os dados chegam. */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <Skeleton className="aspect-[175/200] w-full rounded-[20px] lg:aspect-[258/300] lg:rounded-none" />
      <div className="flex flex-col gap-1.5 px-2 lg:px-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
