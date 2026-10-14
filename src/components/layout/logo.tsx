import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio, página inicial"
      className={cn('inline-flex items-center rounded-sm text-sm font-bold tracking-[0.2em] text-foreground', className)}
    >
      KURIO
    </Link>
  )
}
