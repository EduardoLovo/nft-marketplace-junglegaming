import { useState } from 'react'
import type { NftImage } from '@/contracts/catalog'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MagnifierIcon } from './nft-icons'

/** Quantidade de miniaturas do layout do Figma (todas mostram a arte inteira). */
const THUMBNAILS = 4

function Artwork({
  image,
  sizes,
  priority = false,
  className,
}: {
  image: NftImage
  sizes: string
  priority?: boolean
  className?: string
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('object-cover', className)}
    />
  )
}

/**
 * Galeria do detalhe no desktop, como no Figma: quatro miniaturas de 100px
 * (a selecionada com borda cobre), a arte principal de 404px numa caixa de
 * 444px e a lupa no canto, que amplia a arte num diálogo.
 */
export function NftGallery({ image }: { image: NftImage }) {
  const [active, setActive] = useState(0)

  return (
    <div className="hidden w-[573px] shrink-0 items-center gap-7 lg:flex">
      <div role="group" aria-label="Miniaturas da arte" className="flex flex-col gap-4">
        {Array.from({ length: THUMBNAILS }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Miniatura ${index + 1}`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={cn(
              'size-[100px] shrink-0 overflow-hidden rounded-lg border bg-surface-card',
              index === active ? 'border-primary' : 'border-transparent hover:border-border-strong',
            )}
          >
            <Artwork image={{ ...image, alt: '' }} sizes="100px" className="size-full rounded-lg" />
          </button>
        ))}
      </div>

      <div className="relative flex size-[444px] items-center justify-center rounded-[6px] bg-surface-card p-5">
        <Artwork image={image} sizes="404px" priority className="size-full rounded-3xl" />
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar a arte"
            className="absolute top-[13px] right-3 flex size-[30px] items-center justify-center rounded-full border border-border bg-surface-raised text-foreground hover:border-primary"
          >
            <MagnifierIcon className="size-5" />
          </DialogTrigger>
          <DialogContent className="max-w-[min(90vw,720px)] gap-3 bg-surface-card p-3 sm:max-w-[min(90vw,720px)]">
            <DialogTitle className="sr-only">{image.alt}</DialogTitle>
            <DialogDescription className="sr-only">Arte em tamanho ampliado.</DialogDescription>
            <Artwork image={image} sizes="720px" className="aspect-square w-full rounded-2xl" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
