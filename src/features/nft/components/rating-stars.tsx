import { StarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRating } from '../format'

/** Cinco estrelas com preenchimento proporcional à nota (inclusive frações). */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Nota ${formatRating(value)} de 5`}
      className={cn('relative inline-flex shrink-0', className)}
    >
      <span className="flex gap-1 text-border-strong">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} className="size-[15px] fill-current" aria-hidden="true" />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 flex gap-1 overflow-hidden text-amber"
        style={{ width: `${(Math.min(Math.max(value, 0), 5) / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} className="size-[15px] shrink-0 fill-current" aria-hidden="true" />
        ))}
      </span>
    </span>
  )
}
