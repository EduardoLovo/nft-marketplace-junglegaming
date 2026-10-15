import { Link } from '@tanstack/react-router'
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
/** Ícones das redes extraídos dos vetores do Figma (tamanhos e paths originais). */
const SOCIALS = [
  {
    label: 'Facebook',
    width: 8,
    height: 16,
    path: 'M2 5.333L0 5.333L0 8L2 8L2 16L5.333 16L5.333 8L7.733 8L8 5.333L5.333 5.333L5.333 4.2C5.333 3.6 5.467 3.333 6.067 3.333L8 3.333L8 0L5.467 0C3.067 0 2 1.067 2 3.067L2 5.333Z',
  },
  {
    label: 'Instagram',
    width: 16,
    height: 16,
    path: 'M8 1.467C10.133 1.467 10.4 1.467 11.267 1.533C13.467 1.6 14.467 2.667 14.533 4.8C14.6 5.667 14.6 5.867 14.6 8C14.6 10.133 14.6 10.4 14.533 11.2C14.467 13.333 13.4 14.4 11.267 14.467C10.4 14.533 10.2 14.533 8 14.533C5.867 14.533 5.6 14.533 4.8 14.467C2.6 14.4 1.6 13.333 1.533 11.2C1.467 10.333 1.467 10.133 1.467 8C1.467 5.867 1.467 5.6 1.533 4.8C1.6 2.667 2.667 1.6 4.8 1.533C5.6 1.467 5.867 1.467 8 1.467ZM8 0C5.8 0 5.533 0 4.733 0.067C1.8 0.2 0.2 1.8 0.067 4.733C0 5.533 0 5.8 0 8C0 10.2 0 10.467 0.067 11.267C0.2 14.2 1.8 15.8 4.733 15.933C5.533 16 5.8 16 8 16C10.2 16 10.467 16 11.267 15.933C14.2 15.8 15.8 14.2 15.933 11.267C16 10.467 16 10.2 16 8C16 5.8 16 5.533 15.933 4.733C15.8 1.8 14.2 0.2 11.267 0.067C10.467 0 10.2 0 8 0ZM8 3.867C5.733 3.867 3.867 5.733 3.867 8C3.867 10.267 5.733 12.133 8 12.133C10.267 12.133 12.133 10.267 12.133 8C12.133 5.733 10.267 3.867 8 3.867ZM8 10.667C6.533 10.667 5.333 9.467 5.333 8C5.333 6.533 6.533 5.333 8 5.333C9.467 5.333 10.667 6.533 10.667 8C10.667 9.467 9.467 10.667 8 10.667ZM12.267 2.8C11.733 2.8 11.333 3.2 11.333 3.733C11.333 4.267 11.733 4.667 12.267 4.667C12.8 4.667 13.2 4.267 13.2 3.733C13.2 3.2 12.8 2.8 12.267 2.8Z',
  },
  {
    label: 'Twitter',
    width: 16,
    height: 13.004,
    path: 'M5.032 13.004C11.07 13.004 14.372 8.001 14.372 3.664C14.372 3.521 14.369 3.38 14.362 3.239C15.003 2.776 15.561 2.198 16 1.54C15.412 1.801 14.779 1.977 14.115 2.056C14.793 1.65 15.313 1.007 15.559 0.24C14.924 0.616 14.222 0.89 13.474 1.037C12.875 0.399 12.022 0 11.078 0C9.265 0 7.795 1.47 7.795 3.282C7.795 3.54 7.824 3.79 7.88 4.031C5.152 3.894 2.732 2.587 1.114 0.601C0.831 1.086 0.669 1.65 0.669 2.251C0.669 3.39 1.248 4.395 2.13 4.984C1.591 4.967 1.085 4.819 0.643 4.573C0.642 4.587 0.642 4.6 0.642 4.615C0.642 6.205 1.774 7.532 3.276 7.833C3 7.908 2.71 7.948 2.41 7.948C2.199 7.948 1.993 7.927 1.793 7.889C2.211 9.193 3.423 10.143 4.86 10.169C3.736 11.05 2.321 11.574 0.783 11.574C0.518 11.574 0.257 11.559 0 11.529C1.453 12.46 3.178 13.004 5.032 13.004Z',
  },
  {
    label: 'LinkedIn',
    width: 16,
    height: 15.333,
    path: 'M3.333 1.667C3.333 2.6 2.6 3.333 1.667 3.333C0.733 3.333 0 2.6 0 1.667C0 0.733 0.733 0 1.667 0C2.6 0 3.333 0.733 3.333 1.667ZM3.333 4.667L0 4.667L0 15.333L3.333 15.333L3.333 4.667ZM8.667 4.667L5.333 4.667L5.333 15.333L8.667 15.333L8.667 9.733C8.667 6.6 12.667 6.333 12.667 9.733L12.667 15.333L16 15.333L16 8.6C16 3.333 10.067 3.533 8.667 6.133L8.667 4.667Z',
  },
  {
    label: 'YouTube',
    width: 18.666,
    height: 13.98,
    path: 'M3.422 0.175C6.222 -0.058 12.444 -0.058 15.244 0.175L15.521 0.201C18.301 0.523 18.666 2.348 18.666 7.02L18.661 7.889C18.607 12.068 18.088 13.718 15.244 13.863C12.444 14.019 6.222 14.019 3.422 13.863C0.578 13.645 0.059 12.059 0.005 7.888L0 7.02C0 2.198 0.389 0.408 3.422 0.175ZM14.341 4.357C11.747 4.196 6.916 4.195 4.323 4.357C4.323 4.359 4.323 4.362 4.323 4.364C4.261 4.997 4.236 5.842 4.236 7.02C4.236 8.189 4.261 9.03 4.322 9.661C6.971 9.767 11.696 9.767 14.344 9.661C14.405 9.024 14.43 8.18 14.43 7.02C14.43 5.842 14.404 4.997 14.342 4.364C14.342 4.362 14.341 4.359 14.341 4.357ZM7 7.019C7 5.59 8.504 4.661 9.782 5.3C11.199 6.009 11.199 8.03 9.782 8.738C8.504 9.378 7 8.448 7 7.019Z',
  },
]

const linkClass = 'rounded-sm text-sm leading-[30px] text-foreground hover:text-kurio-accent'

export function SiteFooter() {

  function subscribe(event: FormEvent) {
    event.preventDefault()
    notAvailable('A newsletter')
  }

  return (
    <footer className="mx-auto mt-16 w-full max-w-content lg:mt-24">
      {/* Destaques + newsletter. No desktop, como no Figma: três colunas de
          264,7px separadas por linhas de 1px e a newsletter com 357px. */}
      <section aria-label="Destaques da Kurio" className="bg-surface-card p-6 lg:p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_1.349fr] lg:gap-0">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="contents">
              <div className="flex flex-col gap-3 lg:px-4">
                <span
                  aria-hidden="true"
                  className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
                >
                  {feature.mark}
                </span>
                <h2 className="text-[17px] leading-4 font-bold">{feature.title}</h2>
                <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{feature.text}</p>
              </div>
              <span aria-hidden="true" className="hidden bg-primary lg:block" />
            </div>
          ))}

          <form onSubmit={subscribe} className="flex flex-col gap-3 lg:px-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
              <div className="flex h-10 overflow-hidden rounded-[6px] bg-surface-dark shadow-[0_0_20px_rgb(10_6_4/0.45)]">
                <label htmlFor="newsletter-email" className="sr-only">
                  Seu e-mail
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  placeholder="digite seu e-mail..."
                  className="min-w-0 flex-1 bg-transparent px-[11px] text-sm leading-4 placeholder:text-kurio-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                />
                <button
                  type="submit"
                  className="w-[85px] shrink-0 bg-primary pr-[5px] pl-[15px] text-lg leading-4 font-bold text-ink hover:bg-primary-light"
                >
                  Enviar
                </button>
              </div>
            </div>
            <p className="text-[13px] leading-[22px] text-text-secondary">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </form>
        </div>
      </section>

      {/* Faixa de contato e links usam a mesma grade do Figma: 3 colunas
          iguais + 228px, separadas por 124px no desktop. */}
      <div className="grid gap-4 bg-surface-dark p-6 text-sm leading-[22px] md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:items-center lg:gap-x-[124px] lg:p-8">
        <Logo />
        {/* No Figma a frase tem 219px e passa da coluna; não deve quebrar mais. */}
        <p className="lg:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>

      <div className="bg-surface-card p-6 lg:p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-x-[124px]">
          <nav aria-labelledby="footer-account" className="flex flex-col gap-2">
            <h2 id="footer-account" className="text-lg leading-4 font-bold">
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
            <h2 id="footer-help" className="text-lg leading-4 font-bold">
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
            <h2 id="footer-collections" className="text-lg leading-4 font-bold">
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

          <div className="flex flex-col gap-[33px]">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
              <ul className="flex gap-2">
                {SOCIALS.map(({ label, width, height, path }) => (
                  <li key={label}>
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => notAvailable(`O perfil no ${label}`)}
                      className="flex size-8 items-center justify-center rounded-[4px] border border-primary text-primary hover:bg-primary hover:text-ink"
                    >
                      <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="currentColor">
                        <path d={path} />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-[13px]">
              <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
              <p className="flex h-[26px] items-center justify-center rounded-[6px] border border-border-strong bg-surface-dark pr-px pl-2 text-[9px] font-bold whitespace-pre text-kurio-accent">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No Figma o copyright fica fora do card, sobre o fundo da página. */}
      <p className="mt-1.5 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
