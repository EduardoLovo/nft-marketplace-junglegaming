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
      className="relative h-[190px] overflow-hidden rounded-[30px] bg-linear-to-b from-primary/20 to-primary/10 px-4 pt-[5.5px] lg:h-auto lg:rounded-none lg:bg-none lg:py-0 lg:pr-0 lg:pl-10"
    >
      {/* Elipses do "Hero Banner" mobile do Figma (248px, recortadas pelo card). */}
      <span
        aria-hidden="true"
        className="absolute top-[-31px] left-[-80px] size-62 rounded-full bg-linear-to-b from-[#dd9a5f]/43 to-primary/4 lg:hidden"
      />
      <span
        aria-hidden="true"
        className="absolute top-[-10px] left-[73px] size-62 rounded-full bg-linear-to-b from-[#dd9a5f]/37 to-primary/0 lg:hidden"
      />
      <div className="flex items-center gap-2 max-lg:h-[156px] max-lg:items-start lg:h-[450px] lg:justify-between lg:gap-[110px]">
        <div className="flex min-w-0 flex-1 flex-col lg:max-w-[600px] lg:gap-8">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <p className="text-xs leading-4 font-medium lg:text-sm lg:uppercase">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="text-lg leading-[29px] font-bold uppercase lg:text-[43px] lg:leading-[70px]">
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
            <p className="text-xs leading-[18px] text-text-secondary lg:-mt-1 lg:max-w-[557px] lg:text-sm lg:leading-6">
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
              className="inline-flex items-center gap-2 rounded-sm text-xs leading-4 font-bold uppercase text-primary lg:hidden"
            >
              Explorar
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <Button asChild className="hidden h-10 w-[140px] rounded-[6px] pr-9 pl-7 text-base leading-5 font-bold uppercase lg:inline-flex">
              <Link to="/" hash="mercado">
                Explorar
              </Link>
            </Button>
          </div>

          <div
            role="group"
            aria-label="Destaques do hero"
            className="flex gap-1.5 max-lg:absolute max-lg:bottom-[5.5px] max-lg:left-1/2 max-lg:-translate-x-1/2 lg:mt-3 lg:justify-end lg:gap-2"
          >
            {SLIDES.map((item, index) => (
              <button
                key={item.artwork}
                type="button"
                aria-label={`Mostrar destaque ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  // Figma: três pontos iguais (7px no mobile, 8px no desktop), sem destaque visual do ativo.
                  'size-[7px] rounded-full bg-primary lg:size-2',
                )}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-[5px] h-[146px] w-[138px] shrink-0 lg:mt-0 lg:h-auto lg:w-[450px]">
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
          <img
            src="/images/nfts/ape-violet-320.webp"
            width={58}
            height={58}
            alt=""
            className="absolute top-[88px] left-[14px] size-[58px] rounded-2xl object-cover lg:hidden"
          />
        </div>
      </div>
    </section>
  )
}
