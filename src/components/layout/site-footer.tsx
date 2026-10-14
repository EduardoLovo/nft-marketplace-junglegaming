import { Link } from '@tanstack/react-router'
import { AtSignIcon, GlobeIcon, MessageCircleIcon, SendIcon, VideoIcon } from 'lucide-react'
import { type FormEvent } from 'react'
import { NFT_CATEGORIES, type NftCategory } from '@/contracts/catalog'
import { notAvailable } from '@/lib/not-available'
import { Logo } from './logo'

const FEATURES = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const HELP_LINKS = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']
const FOOTER_CATEGORIES: NftCategory[] = ['digital-art', 'photography', 'music', '3d-art', 'utility']
const SOCIALS = [
  { label: 'Instagram', icon: AtSignIcon },
  { label: 'Discord', icon: MessageCircleIcon },
  { label: 'YouTube', icon: VideoIcon },
  { label: 'Telegram', icon: SendIcon },
  { label: 'Site', icon: GlobeIcon },
]

const linkClass = 'rounded-sm text-sm leading-[30px] text-foreground hover:text-kurio-accent'

export function SiteFooter() {
  function subscribe(event: FormEvent) {
    event.preventDefault()
    notAvailable('A newsletter')
  }

  return (
    <footer className="mx-auto mt-16 w-full max-w-content lg:mt-24">
      <section aria-label="Destaques da Kurio" className="bg-surface-card p-6 lg:p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr] lg:gap-7">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="contents">
              <div className="flex flex-col gap-3 px-0 lg:px-4">
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
                >
                  {feature.mark}
                </span>
                <h2 className="text-[17px] font-bold">{feature.title}</h2>
                <p className="text-sm leading-[22px] text-text-secondary">{feature.text}</p>
              </div>
              <span aria-hidden="true" className="hidden w-px bg-primary lg:block" />
            </div>
          ))}

          <form onSubmit={subscribe} className="flex flex-col gap-4 lg:px-4">
            <h2 className="text-lg font-bold leading-4">Antecipe-se ao próximo lançamento</h2>
            <div className="flex overflow-hidden rounded-[6px] bg-surface-dark shadow-[0_0_20px_rgb(10_6_4/0.45)]">
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="digite seu e-mail..."
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm placeholder:text-kurio-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              />
              <button type="submit" className="bg-primary px-4 text-lg font-bold text-ink hover:bg-primary-light">
                Enviar
              </button>
            </div>
            <p className="text-[13px] leading-[22px] text-text-secondary">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </form>
        </div>
      </section>

      <div className="flex flex-col gap-4 bg-surface-dark p-6 text-sm leading-[22px] md:flex-row md:items-center md:gap-12 lg:gap-[92px] lg:p-8">
        <Logo />
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>

      <div className="bg-surface-card p-6 lg:p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:flex lg:gap-[124px]">
          <nav aria-labelledby="footer-account" className="flex flex-col gap-2">
            <h2 id="footer-account" className="text-lg font-bold leading-4">
              Meu perfil
            </h2>
            <ul>
              <li>
                <Link to="/profile" className={linkClass}>
                  Meu perfil
                </Link>
              </li>
              {['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'].map((label) => (
                <li key={label}>
                  <button type="button" className={linkClass} onClick={() => notAvailable(`A seção ${label}`)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help" className="flex flex-col gap-2">
            <h2 id="footer-help" className="text-lg font-bold leading-4">
              Central de ajuda
            </h2>
            <ul>
              {HELP_LINKS.map((label) => (
                <li key={label}>
                  <button type="button" className={linkClass} onClick={() => notAvailable(`A página ${label}`)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-collections" className="flex flex-col gap-2">
            <h2 id="footer-collections" className="text-lg font-bold leading-4">
              Coleções
            </h2>
            <ul>
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category}>
                  <Link to="/" search={{ categories: [category] }} hash="mercado" className={linkClass}>
                    {NFT_CATEGORIES[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold leading-4">Redes sociais</h2>
              <ul className="flex gap-2.5">
                {SOCIALS.map(({ label, icon: Icon }) => (
                  <li key={label}>
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => notAvailable(`O perfil no ${label}`)}
                      className="flex size-8 items-center justify-center rounded-[4px] border border-primary text-primary hover:bg-primary hover:text-ink"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold leading-4">Carteiras compatíveis</h2>
              <p className="w-fit rounded-[6px] border border-border-strong bg-surface-dark px-2 py-2 text-[9px] font-bold tracking-wide text-kurio-accent">
                METAMASK • WALLETCONNECT • COINBASE
              </p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
