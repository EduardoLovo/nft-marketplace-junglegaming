import { Link } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/contracts/cart'
import { isApiError } from '@/lib/api/errors'
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
      <label htmlFor={inputId} className="text-sm leading-4 font-bold">
        Código promocional
      </label>
      <div className="flex h-10 items-center rounded-[3px] border border-primary pl-2 focus-within:ring-3 focus-within:ring-ring/50">
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
          className="h-full min-w-0 flex-1 bg-transparent text-xs uppercase placeholder:normal-case placeholder:text-text-muted focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={apply.isPending || !code.trim()}
          className="h-full w-[102px] rounded-[3px] bg-primary text-[15px] font-bold text-ink hover:bg-primary-light disabled:opacity-60"
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

export function CartSummary({ cart }: { cart: Cart }) {
  const syncing = useIsCartSyncing()
  const blocker = checkoutBlocker(cart)
  const hasDiscount = compareEth(cart.summary.discountEth, '0') > 0

  return (
    <aside aria-labelledby="summary-title" className="flex w-full flex-col gap-6 lg:w-[332px]">
      <h2 id="summary-title" className="border-b-[0.3px] border-primary pb-3 text-lg leading-4 font-bold">
        Resumo do pedido
      </h2>

      <CouponForm cart={cart} />

      {/* Durante uma alteração os totais ficam esmaecidos até o servidor recalcular. */}
      <div aria-busy={syncing} className="flex flex-col gap-3 transition-opacity aria-busy:opacity-50">
        <dl className="flex flex-col gap-3 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="text-lg leading-5">{formatEth(cart.summary.subtotalEth)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{hasDiscount && cart.coupon ? `Desconto (${cart.coupon.code})` : 'Desconto do lançamento'}</dt>
            <dd className={hasDiscount ? 'text-success' : undefined}>(-) {formatEth(cart.summary.discountEth)}</dd>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex w-full justify-between gap-4">
              <dt>Taxa de rede</dt>
              <dd className="text-lg leading-5">{formatEth(cart.summary.networkFeeEth)}</dd>
            </div>
            <p className="text-xs text-primary">Taxa estimada</p>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <dt className="text-base font-bold">Total</dt>
            <dd className="text-lg leading-4 font-bold text-primary">{formatEth(cart.summary.totalEth)}</dd>
          </div>
        </dl>
        <p className="sr-only" aria-live="polite">
          {syncing ? 'Atualizando totais…' : `Total do pedido: ${formatEth(cart.summary.totalEth)}`}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {blocker || syncing ? (
          <Button disabled className="h-10 w-full rounded-[3px] text-[15px] font-bold">
            Conectar e finalizar
          </Button>
        ) : (
          <Button asChild className="h-10 w-full rounded-[3px] text-[15px] font-bold">
            <Link to="/checkout">Conectar e finalizar</Link>
          </Button>
        )}
        {blocker && <p className="text-center text-xs text-text-secondary">{blocker}</p>}
        <Link to="/" hash="mercado" className="rounded-sm text-[15px] text-primary hover:underline">
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}
