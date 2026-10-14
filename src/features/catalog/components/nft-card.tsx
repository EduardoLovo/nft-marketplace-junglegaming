import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts/catalog'
import { formatEth } from '@/lib/eth'
import { Skeleton } from '@/components/ui/skeleton'

/** Larguras reais do card em cada breakpoint, para o navegador escolher a imagem certa. */
const CARD_IMAGE_SIZES = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw'

interface NftCardProps {
  nft: NftSummary
  /** Primeiros cards visíveis: carregamento imediato para não atrasar o LCP. */
  priority?: boolean
}

export function NftCard({ nft, priority = false }: NftCardProps) {
  const soldOut = nft.status === 'sold-out'

  return (
    <article className="group relative flex flex-col gap-2 lg:gap-3">
      <div className="relative flex aspect-[175/200] items-center justify-center rounded-[20px] bg-linear-to-b from-surface-card to-surface-raised lg:aspect-[258/300] lg:rounded-none lg:bg-surface-card lg:bg-none">
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
          className="aspect-square w-[96%] rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] lg:rounded-[15px]"
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {nft.isRare && (
            <span className="rounded-sm bg-primary px-2 py-1 text-[13px] font-medium uppercase text-ink">Raro</span>
          )}
          {soldOut && (
            <span className="rounded-sm border border-border-strong bg-ink/90 px-2 py-1 text-[13px] font-medium uppercase text-foreground">
              Esgotado
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 px-2 lg:px-0">
        <h3 className="truncate text-[15px] leading-5 lg:text-base lg:leading-4">
          {/* O link cobre o card inteiro, mas o nome é o seu texto acessível. */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="rounded-sm after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring lg:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="text-base leading-4 font-bold text-primary lg:text-lg">
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
