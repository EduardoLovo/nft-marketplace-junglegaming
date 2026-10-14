import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** O layout usa só placeholder; o rótulo existe para leitores de tela. */
  hideLabel?: boolean
  error?: string
  hint?: string
}

/**
 * Campo de texto com rótulo, dica e erro associados por `aria-describedby`.
 * `type="password"` ganha o botão de mostrar/ocultar do Figma.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel = false, error, hint, type = 'text', className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div
        className={cn(
          'flex h-10 items-center rounded-[5px] border bg-transparent px-4 transition-colors focus-within:ring-3 focus-within:ring-ring/40',
          error ? 'border-coral' : 'border-border focus-within:border-primary',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-sm placeholder:text-text-muted focus-visible:outline-none"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="-mr-1 rounded-sm p-1 text-text-muted hover:text-foreground"
          >
            {visible ? <EyeOffIcon className="size-5" aria-hidden="true" /> : <EyeIcon className="size-5" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  )
})
