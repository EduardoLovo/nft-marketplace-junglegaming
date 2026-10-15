import { Link } from '@tanstack/react-router'

/** Destaque editorial da sidebar, apontando para um NFT fixo do catálogo. */
export function FeaturedBanner() {
  return (
    <aside
      aria-labelledby="featured-title"
      className="relative flex flex-col gap-4 bg-linear-to-b from-primary/10 to-primary/3 pt-6 pb-1"
    >
      {/* No Figma o título é alinhado à esquerda e "Oferta limitada", centralizado. */}
      <div className="flex flex-col gap-4 px-5">
        <h2 id="featured-title" className="text-2xl leading-8 font-bold text-kurio-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="text-center text-[22px] leading-4 font-bold text-foreground">OFERTA LIMITADA</p>
      </div>
      <Link
        to="/nfts/$nftId"
        params={{ nftId: 'violet-nomad-314' }}
        aria-label="Ver o NFT em destaque: Violet Nomad #314"
        className="block rounded-[22px]"
      >
        <img
          src="/images/nfts/ape-violet-640.webp"
          srcSet="/images/nfts/ape-violet-320.webp 320w, /images/nfts/ape-violet-640.webp 640w"
          sizes="310px"
          width={310}
          height={368}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[368px] w-full rounded-[22px] object-cover"
        />
      </Link>
      {/* Formas decorativas do Figma (posições relativas ao banner de 310px). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-linear-to-b from-primary to-primary/0"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-linear-to-b from-primary to-primary/0"
      />
    </aside>
  )
}
