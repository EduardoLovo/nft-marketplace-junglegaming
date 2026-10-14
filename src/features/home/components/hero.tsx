import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Artes que alternam no hero (os pontos do layout funcionam como seletor). */
const SLIDES = [
  { artwork: 'ape-emerald', alt: 'Emerald Ape #042, macaco de óculos redondos e jaqueta verde' },
  { artwork: 'ape-golden', alt: 'Golden Beat #207, macaco dourado com fones de ouvido' },
  { artwork: 'ape-ivory', alt: 'Ivory Baron #088, macaco de blazer claro e gola alta' },
]

const srcSet = (artwork: string) =>
  [320, 640, 960].map((w) => `/images/nfts/${artwork}-${w}.webp ${w}w`).join(', ')

export function Hero() {
  const [active, setActive] = useState(0)
  const slide = SLIDES[active]

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-[30px] bg-linear-to-b from-primary/20 to-primary/10 p-4 lg:rounded-3xl lg:px-10 lg:py-0"
    >
      <div className="flex items-center gap-2 lg:h-[450px] lg:justify-between lg:gap-[110px]">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[600px] lg:gap-8">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <p className="text-xs font-medium uppercase lg:text-sm lg:leading-4">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="text-lg leading-tight font-bold uppercase lg:text-[43px] lg:leading-[70px]">
              <span className="lg:hidden">
                Seja dono da
                <br />
                cultura digital
              </span>
              <span className="hidden lg:inline">
                Seja dono do futuro
                <br />
                da arte digital
              </span>
            </h1>
            <p className="text-xs leading-[18px] text-text-secondary lg:mt-1 lg:max-w-[557px] lg:text-sm lg:leading-6">
              <span className="lg:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
              <span className="hidden lg:inline">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
                artistas e tenha uma parte da cultura da internet.
              </span>
            </p>
          </div>

          <div>
            <Link
              to="/"
              hash="mercado"
              className="inline-flex items-center gap-2 rounded-sm text-xs font-bold uppercase text-primary lg:hidden"
            >
              Explorar
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <Button asChild className="hidden h-10 rounded-[6px] pr-9 pl-7 text-base font-bold uppercase lg:inline-flex">
              <Link to="/" hash="mercado">
                Explorar
              </Link>
            </Button>
          </div>

          <div role="group" aria-label="Destaques do hero" className="flex gap-2 lg:justify-end">
            {SLIDES.map((item, index) => (
              <button
                key={item.artwork}
                type="button"
                aria-label={`Mostrar destaque ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  'size-2 rounded-full transition-[width,background-color]',
                  index === active ? 'w-5 bg-primary' : 'bg-primary/50 hover:bg-primary',
                )}
              />
            ))}
          </div>
        </div>

        <div className="relative w-[138px] shrink-0 lg:w-[450px]">
          {/* Imagem do LCP: carregamento imediato e prioridade alta. */}
          <img
            key={slide.artwork}
            src={`/images/nfts/${slide.artwork}-640.webp`}
            srcSet={srcSet(slide.artwork)}
            sizes="(min-width: 1024px) 450px, 138px"
            width={450}
            height={450}
            alt={slide.alt}
            fetchPriority={active === 0 ? 'high' : 'auto'}
            className="aspect-square w-full rounded-2xl object-cover lg:rounded-3xl"
          />
        </div>
      </div>
    </section>
  )
}
