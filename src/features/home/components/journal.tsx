import { notAvailable } from '@/lib/not-available'

const POSTS = [
  {
    date: '12 de setembro',
    readTime: '6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    artwork: 'ape-ivory',
  },
  {
    date: '13 de setembro',
    readTime: '2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    artwork: 'ape-emerald',
  },
  {
    date: '15 de setembro',
    readTime: '3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    artwork: 'ape-violet',
  },
  {
    date: '15 de setembro',
    readTime: '2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    artwork: 'ape-golden',
  },
]

/**
 * "Diário da Cunhagem": conteúdo editorial, fora do escopo do desafio. Os
 * cards aparecem como no layout, mas "Ler mais" informa a indisponibilidade.
 */
export function Journal() {
  return (
    <section aria-labelledby="journal-title" className="flex flex-col items-center gap-8 lg:gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="journal-title" className="text-2xl font-bold lg:text-[28px] lg:leading-[37px]">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-[repeat(4,268px)]">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface-card">
              <img
                src={`/images/nfts/${post.artwork}-640.webp`}
                srcSet={`/images/nfts/${post.artwork}-320.webp 320w, /images/nfts/${post.artwork}-640.webp 640w`}
                sizes="(min-width: 1024px) 268px, (min-width: 640px) 45vw, 90vw"
                width={268}
                height={195}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[195px] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium text-text-secondary">
                  {post.date} | Leitura de {post.readTime}
                </p>
                <h3 className="text-base leading-[21px] font-bold">{post.title}</h3>
                <p className="text-xs leading-4 font-medium text-text-secondary">{post.text}</p>
                <button
                  type="button"
                  onClick={() => notAvailable('O Diário da Cunhagem')}
                  className="mt-auto w-fit rounded-sm text-xs font-bold text-kurio-accent hover:underline"
                >
                  Ler mais <span aria-hidden="true">→</span>
                  <span className="sr-only">: {post.title}</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
