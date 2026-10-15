import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ArrowDownIcon } from './checkout-icons'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  placeholder?: string
  options: Array<{ value: string; label: string }>
  error?: string
  required?: boolean
}

/**
 * Select do formulário de pagamento do Figma: rótulo numa faixa de 29px com o
 * asterisco coral, caixa de 40px com raio 3 e a seta "Arrow-Down" de 18px.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, placeholder, options, error, required = false, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={selectId} className="flex h-[29px] items-center text-[15px] leading-[15px] whitespace-nowrap">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[22px] leading-none text-coral">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-10 w-full appearance-none rounded-[3px] border bg-transparent pr-8 pl-[13px] text-sm leading-[15px] text-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-default',
            error ? 'border-coral' : 'border-border',
            // Placeholder (valor vazio) na cor secundária, como no Figma.
            'has-[option[value=""]:checked]:text-kurio-secondary',
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface-card text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <ArrowDownIcon className="pointer-events-none absolute top-1/2 right-2 size-[18px] -translate-y-1/2 text-kurio-secondary" />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
})
