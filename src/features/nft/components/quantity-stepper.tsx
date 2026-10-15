import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Seletor de quantidade inteira entre `min` e `max`. Usado no detalhe e no
 * carrinho; o tamanho segue as duas variantes do Figma.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = 'lg',
  label = 'Quantidade',
  disabled = false,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** 'round': círculos escuros de 24px do carrinho mobile do Figma. */
  size?: 'sm' | 'lg' | 'round'
  label?: string
  disabled?: boolean
}) {
  if (size === 'round') {
    const roundClass =
      'flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground disabled:cursor-not-allowed'
    return (
      <div role="group" aria-label={label} className="flex items-center gap-3">
        <button
          type="button"
          className={roundClass}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label="Diminuir quantidade"
        >
          {/* Traço de 9x2px: cor da borda quando não dá para diminuir, como no Figma. */}
          <span aria-hidden="true" className={cn('h-0.5 w-[9px]', disabled || value <= min ? 'bg-border-strong' : 'bg-foreground')} />
        </button>
        <output aria-live="polite" className="min-w-2.5 text-center text-base leading-4">
          {value}
        </output>
        <button
          type="button"
          className={cn(roundClass, 'text-[21px] leading-none disabled:text-border-strong')}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label="Aumentar quantidade"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    )
  }

  const buttonClass = cn(
    'flex items-center justify-center rounded-full border border-ink bg-primary text-ink shadow-[0_6px_20px_rgb(20_13_10/0.15)] transition-opacity hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' ? 'h-[49.5px] w-[33px]' : 'h-[30px] w-5',
  )

  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="Diminuir quantidade"
      >
        <MinusIcon className={size === 'lg' ? 'size-5' : 'size-3.5'} aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cn('min-w-4 text-center', size === 'lg' ? 'text-xl' : 'text-lg font-medium')}>
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        <PlusIcon className={size === 'lg' ? 'size-5' : 'size-3.5'} aria-hidden="true" />
      </button>
    </div>
  )
}
