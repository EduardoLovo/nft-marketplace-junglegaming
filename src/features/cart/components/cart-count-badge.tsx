import { useCartCount } from '../hooks'

/** Badge com a quantidade de itens, sobre o ícone do carrinho (como no Figma). */
export function CartCountBadge({ className = '' }: { className?: string }) {
  const count = useCartCount()
  if (count === 0) return null
  return (
    <span
      aria-hidden="true"
      className={`absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-ink outline-2 outline-background ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
