import { useRouterState } from '@tanstack/react-router'
import { LinkedinIcon, MailIcon, TwitterIcon } from './nft-icons'

/**
 * "Compartilhar este NFT" do Figma: LinkedIn, e-mail e Twitter, cada um um
 * link de compartilhamento com o endereço da página (abre em nova aba).
 */
export function ShareLinks({ title }: { title: string }) {
  const href = useRouterState({ select: (state) => state.location.href })
  const url = typeof window === 'undefined' ? href : new URL(href, window.location.origin).toString()
  const text = `${title} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <LinkedinIcon className="h-[14.4px] w-[15px]" />,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: <MailIcon className="size-[18px]" />,
    },
    {
      label: 'Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <TwitterIcon className="h-[12.2px] w-4" />,
    },
  ]

  return (
    <span className="flex items-center gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Compartilhar ${title} por ${link.label}`}
          className="flex rounded-sm text-foreground hover:text-kurio-accent"
        >
          {link.icon}
        </a>
      ))}
    </span>
  )
}
