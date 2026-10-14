import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CatalogTab } from '@/contracts/catalog'

const PROMOS: Array<{ title: string[]; text: string; artwork: string; tab: CatalogTab }> = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    artwork: 'ape-emerald',
    tab: 'new',
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    artwork: 'ape-ivory',
    tab: 'trending',
  },
]

export function Promos() {
  return (
    <section aria-label="Promoções" className="grid gap-4 md:grid-cols-2 lg:gap-7">
      {PROMOS.map((promo) => (
        <article
          key={promo.artwork}
          className="relative flex min-h-[250px] overflow-hidden rounded-lg bg-surface-card"
        >
          {/* Círculos decorativos do layout. */}
          <span aria-hidden="true" className="absolute -top-10 right-[-60px] size-64 rounded-full border-2 border-primary/40" />
          <span aria-hidden="true" className="absolute -top-2 right-[-90px] size-64 rounded-full border border-primary/25" />

          <img
            src={`/images/nfts/${promo.artwork}-640.webp`}
            srcSet={`/images/nfts/${promo.artwork}-320.webp 320w, /images/nfts/${promo.artwork}-640.webp 640w`}
            sizes="(min-width: 1024px) 292px, 45vw"
            width={292}
            height={250}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-[45%] max-w-[292px] shrink-0 rounded-[18px] object-cover"
          />

          <div className="relative flex flex-1 flex-col items-end justify-center gap-4 p-5 text-right lg:p-6">
            <h2 className="text-base leading-6 font-bold uppercase lg:text-lg">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.text}</p>
            <Button asChild className="h-10 w-[140px] justify-between rounded-[6px] px-6 text-sm font-medium">
              <Link to="/" search={{ tab: promo.tab }} hash="mercado">
                Explorar
                <ArrowRightIcon className="size-[18px]" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}
