import { EyeIcon } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { HideIcon } from './hide-icon'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** O layout usa só placeholder; o rótulo existe para leitores de tela. */
  hideLabel?: boolean
  error?: string
  hint?: string
  /** Marca o campo como obrigatório com o asterisco do layout. */
  required?: boolean
  /**
   * Botão de mostrar/ocultar em campos de senha. 'mobile': só no mobile, como
   * o "Confirmar senha" do Figma, que tem o ícone no mobile e não no desktop.
   */
  revealable?: boolean | 'mobile'
  /**
   * 'auth': login/cadastro, com 50px e raio 10 no mobile. 'checkout': pagamento,
   * rótulo numa faixa de 29px colada ao campo, raio 3 e placeholder secundário.
   * 'profile': como o pagamento, com 10px entre o rótulo e o campo.
   * 'profile-compact': senhas do perfil, rótulo de 15px a 12px do campo.
   */
  variant?: 'default' | 'auth' | 'checkout' | 'profile' | 'profile-compact'
}

/**
 * Campo de texto com rótulo, dica e erro associados por `aria-describedby`.
 * `type="password"` ganha o botão de mostrar/ocultar do Figma.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel = false, error, hint, required = false, revealable = true, variant = 'default', type = 'text', className, id, ...props },
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
    <div className={cn('flex flex-col', variant === 'checkout' ? 'gap-0' : variant === 'profile' ? 'gap-2.5' : variant === 'profile-compact' ? 'gap-3' : 'gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className={cn('text-[15px] font-normal', (variant === 'checkout' || variant === 'profile') && 'flex h-[29px] items-center leading-[15px]',
          variant === 'profile-compact' && 'leading-[15px]', hideLabel && 'sr-only')}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-xl leading-none text-coral">
            *
          </span>
        )}
      </label>
      <div
        className={cn(
          'flex h-10 items-center rounded-[5px] border bg-transparent px-4 transition-colors focus-within:ring-3 focus-within:ring-ring/40',
          variant === 'auth' && 'max-sm:h-[50px] max-sm:rounded-[10px]',
          (variant === 'checkout' || variant === 'profile' || variant === 'profile-compact') && 'rounded-[3px] pl-[13px]',
          error ? 'border-coral' : 'border-border focus-within:border-primary',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-sm focus-visible:outline-none',
            variant === 'checkout' || variant === 'profile' ? 'leading-[15px] placeholder:text-kurio-secondary' : 'placeholder:text-text-muted',
          )}
          {...props}
        />
        {isPassword && revealable && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className={cn(
              '-mr-1 rounded-sm p-0.5 text-[#727272] hover:text-foreground',
              revealable === 'mobile' && 'sm:hidden',
            )}
          >
            {/* Oculta: o "Hide" do Figma (22,7x20). Visível: olho aberto, que o layout não define. */}
            {visible ? <EyeIcon className="size-5" aria-hidden="true" /> : <HideIcon className={variant === 'auth' ? 'size-[18px] sm:h-5 sm:w-[22.7px]' : 'h-5 w-[22.7px]'} />}
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
