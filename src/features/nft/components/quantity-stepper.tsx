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
  size?: 'sm' | 'lg'
  label?: string
  disabled?: boolean
}) {
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
