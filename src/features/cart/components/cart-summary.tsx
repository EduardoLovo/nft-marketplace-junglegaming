import { Link } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/contracts/cart'
import { isApiError } from '@/lib/api/errors'
import { useSession } from '@/features/auth/use-session'
import { compareEth, formatEth } from '@/lib/eth'
import { useApplyCoupon, useIsCartSyncing, useRemoveCoupon } from '../hooks'

function CouponForm({ cart }: { cart: Cart }) {
  const [code, setCode] = useState('')
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const inputId = useId()
  const errorId = useId()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    apply.mutate(code, { onSuccess: () => setCode('') })
  }

  if (cart.coupon) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-4 font-bold">Código promocional</p>
        <div className="flex items-center justify-between gap-3 rounded-[3px] border border-primary px-3 py-2.5">
          <div className="min-w-0 text-sm">
            <p className="font-bold text-primary">{cart.coupon.code}</p>
            <p className="text-xs text-text-secondary">{cart.coupon.description}</p>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            aria-label={`Remover cupom ${cart.coupon.code}`}
            className="rounded-sm text-text-secondary hover:text-coral"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
        {!cart.coupon.valid && (
          <p role="alert" className="text-xs text-coral">
            {cart.coupon.reason} O desconto não está sendo aplicado.
          </p>
        )}
      </div>
    )
  }

  const error = apply.error
  const message = error ? (isApiError(error) ? (error.fields.code ?? error.message) : 'Não foi possível aplicar o cupom.') : null

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={inputId} className="text-sm leading-4 font-bold max-lg:sr-only">
        Código promocional
      </label>
      <div className="flex h-[50px] items-center rounded-[40px] border border-border bg-surface-card pl-4 shadow-[0_6px_20px_rgb(10_6_4/0.45)] focus-within:ring-3 focus-within:ring-ring/50 lg:h-10 lg:rounded-[3px] lg:border-primary lg:bg-transparent lg:pl-2 lg:shadow-none">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] uppercase placeholder:normal-case placeholder:text-text-muted focus-visible:outline-none lg:text-xs"
        />
        <button
          type="submit"
          disabled={apply.isPending || !code.trim()}
          className="h-full w-[97px] rounded-[40px] bg-linear-to-b from-primary/55 to-primary text-[15px] leading-4 font-bold text-foreground hover:bg-primary-light disabled:opacity-60 lg:w-[102px] lg:rounded-[3px] lg:bg-primary lg:bg-none lg:text-ink"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {message && (
        <p id={errorId} role="alert" className="text-xs text-coral">
          {message}
        </p>
      )}
    </form>
  )
}

/** Motivo de bloqueio do checkout, ou `null` se o carrinho pode seguir. */
function checkoutBlocker(cart: Cart) {
  if (cart.summary.itemCount === 0) return 'Adicione um NFT disponível para continuar.'
  if (cart.items.some((item) => item.status === 'unavailable' || item.status === 'insufficient-stock')) {
    return 'Resolva os itens esgotados ou com estoque menor antes de continuar.'
  }
  if (cart.items.some((item) => item.status === 'price-changed')) {
    return 'Confirme os novos preços antes de continuar.'
  }
  return null
}

/** Desktop: 40px com raio 3. Mobile: 60px em pílula com degradê e texto escuro. */
const CHECKOUT_BUTTON =
  'h-[60px] w-full rounded-[40px] bg-linear-to-b from-primary to-primary/80 text-base leading-4 font-bold text-ink lg:h-10 lg:rounded-[3px] lg:bg-primary lg:bg-none lg:text-[15px]'

export function CartSummary({ cart }: { cart: Cart }) {
  const syncing = useIsCartSyncing()
  // Com sessão não há o que conectar: o botão só finaliza.
  const checkoutLabel = useSession() ? 'Finalizar' : 'Conectar e finalizar'
  const asideRef = useRef<HTMLElement>(null)

  // No mobile o resumo fica fixo no rodapé e a página rola por trás: a altura
  // real dele (varia com cupom e avisos) vira o espaço reservado no fim da página.
  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return
    const root = document.documentElement
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty('--cart-summary-height', `${Math.ceil(entry.borderBoxSize[0].blockSize)}px`)
    })
    observer.observe(aside)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--cart-summary-height')
    }
  }, [])
  const blocker = checkoutBlocker(cart)
  const hasDiscount = compareEth(cart.summary.discountEth, '0') > 0

  return (
    // Mobile: "Payment Summary" do Figma, painel fixo no rodapé com cantos de 40px.
    <aside
      ref={asideRef}
      aria-labelledby="summary-title"
      className="z-30 flex w-full flex-col gap-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-[40px] max-lg:bg-surface-card max-lg:px-6 max-lg:pt-6 max-lg:pb-[calc(2.25rem+env(safe-area-inset-bottom))] lg:w-[332px] lg:gap-6"
    >
      <h2 id="summary-title" className="text-lg leading-4 font-bold max-lg:sr-only lg:border-b-[0.3px] lg:border-primary lg:pb-3">
        Resumo da carteira
      </h2>

      <CouponForm cart={cart} />

      {/* Durante uma alteração os totais ficam esmaecidos até o servidor recalcular. */}
      <div aria-busy={syncing} className="flex flex-col gap-3 transition-opacity aria-busy:opacity-50">
        <dl className="flex flex-col gap-3 text-[15px] leading-5">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="text-base leading-5 lg:text-lg">{formatEth(cart.summary.subtotalEth)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{hasDiscount && cart.coupon ? `Desconto (${cart.coupon.code})` : 'Desconto do lançamento'}</dt>
            <dd className={hasDiscount ? 'text-success' : undefined}>(-) {formatEth(cart.summary.discountEth)}</dd>
          </div>
          <div className="flex flex-col items-end lg:gap-3">
            <div className="flex w-full justify-between gap-4">
              <dt>Taxa de rede</dt>
              <dd className="text-base leading-5 lg:text-lg">{formatEth(cart.summary.networkFeeEth)}</dd>
            </div>
            <p className="text-xs leading-4 text-primary">Taxa estimada</p>
          </div>
          {/* No desktop o total fica 24px abaixo das taxas, sem divisória. */}
          <div className="flex justify-between gap-4 lg:mt-3">
            <dt className="text-base leading-4 font-bold">Total</dt>
            <dd className="text-lg leading-4 font-bold text-primary">{formatEth(cart.summary.totalEth)}</dd>
          </div>
        </dl>
        <p className="sr-only" aria-live="polite">
          {syncing ? 'Atualizando totais…' : `Total do pedido: ${formatEth(cart.summary.totalEth)}`}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 max-lg:mt-5">
        {blocker || syncing ? (
          <Button disabled className={CHECKOUT_BUTTON}>
            {checkoutLabel}
          </Button>
        ) : (
          <Button asChild className={CHECKOUT_BUTTON}>
            <Link to="/checkout">{checkoutLabel}</Link>
          </Button>
        )}
        {blocker && <p className="text-center text-xs text-text-secondary">{blocker}</p>}
        <Link to="/" hash="mercado" className="hidden rounded-sm text-[15px] leading-5 text-primary hover:underline lg:inline">
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}
