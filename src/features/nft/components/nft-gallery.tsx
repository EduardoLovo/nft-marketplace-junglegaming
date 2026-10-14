import { useState } from 'react'
import type { NftImage } from '@/contracts/catalog'
import { cn } from '@/lib/utils'

/**
 * Cada NFT tem uma única arte; as miniaturas do layout viram recortes
 * ampliados dela (rosto, figurino, acessórios) para valer a pena navegar.
 */
const VIEWS = [
  { label: 'Arte completa', zoom: 1, origin: '50% 50%' },
  { label: 'Detalhe do rosto', zoom: 1.9, origin: '55% 38%' },
  { label: 'Detalhe do figurino', zoom: 2.1, origin: '50% 88%' },
  { label: 'Detalhe do acessório', zoom: 2.6, origin: '28% 42%' },
]

function ZoomedImage({
  image,
  view,
  sizes,
  priority = false,
  className,
}: {
  image: NftImage
  view: (typeof VIEWS)[number]
  sizes: string
  priority?: boolean
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden', className)}>
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={view.zoom === 1 ? image.alt : `${image.alt}: ${view.label.toLowerCase()}`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ transform: `scale(${view.zoom})`, transformOrigin: view.origin }}
        className="size-full object-cover transition-transform duration-300"
      />
    </div>
  )
}

export function NftGallery({ image }: { image: NftImage }) {
  const [active, setActive] = useState(0)

  return (
    <div className="flex w-full flex-col-reverse gap-4 lg:w-[573px] lg:flex-row lg:items-center lg:gap-7">
      <div role="group" aria-label="Visualizações da arte" className="flex gap-3 lg:flex-col lg:gap-4">
        {VIEWS.map((view, index) => (
          <button
            key={view.label}
            type="button"
            aria-label={view.label}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={cn(
              'size-16 shrink-0 overflow-hidden rounded-lg border lg:size-[100px]',
              index === active ? 'border-primary' : 'border-transparent hover:border-border-strong',
            )}
          >
            <ZoomedImage image={image} view={view} sizes="100px" className="size-full" />
          </button>
        ))}
      </div>

      <div className="flex aspect-square w-full items-center justify-center rounded-[6px] bg-surface-card p-4 lg:size-[444px]">
        <ZoomedImage
          image={image}
          view={VIEWS[active]}
          sizes="(min-width: 1024px) 404px, 90vw"
          priority
          className="size-full rounded-3xl"
        />
      </div>
    </div>
  )
}
