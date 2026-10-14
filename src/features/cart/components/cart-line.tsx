import { Link } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import type { CartItem } from '@/contracts/cart'
import { QuantityStepper } from '@/features/nft/components/quantity-stepper'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useRemoveCartItem, useUpdateCartItem } from '../hooks'

/** Aviso da linha quando preço ou estoque mudaram desde que o item entrou no carrinho. */
function LineNotice({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()

  if (item.status === 'unavailable') {
    return <p className="text-xs font-medium text-coral">Esgotado: remova para continuar.</p>
  }
  if (item.status === 'insufficient-stock') {
    return (
      <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-coral">
        {item.maxQuantity === 1 ? 'Só resta 1 disponível.' : `Só restam ${item.maxQuantity} disponíveis.`}
        <button
          type="button"
          className="rounded-sm underline hover:text-foreground"
          onClick={() => update.mutate({ editionId: item.editionId, quantity: item.maxQuantity })}
        >
          Ajustar para {item.maxQuantity}
        </button>
      </p>
    )
  }
  if (item.status === 'price-changed') {
    return (
      <p className="text-xs font-medium text-amber">
        Preço atualizado: antes <s>{formatEth(item.acceptedUnitPriceEth)}</s>
      </p>
    )
  }
  return null
}

export function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const unavailable = item.status === 'unavailable'

  const stepper = (
    <QuantityStepper
      size="sm"
      label={`Quantidade de ${item.name}`}
      value={item.quantity}
      // Com estoque menor que a quantidade, só é possível diminuir.
      max={Math.max(item.maxQuantity, 1)}
      onChange={(quantity) => update.mutate({ editionId: item.editionId, quantity })}
      disabled={unavailable}
    />
  )

  const removeButton = (
    <button
      type="button"
      onClick={() => remove.mutate(item.editionId)}
      aria-label={`Remover ${item.name} do carrinho`}
      className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-raised hover:text-coral"
    >
      <Trash2Icon className="size-5" aria-hidden="true" />
    </button>
  )

  return (
    <li
      className={cn(
        'relative flex gap-4 rounded-[14px] bg-surface-card shadow-[0_6px_20px_rgb(10_6_4/0.45)] lg:grid lg:min-h-[70px] lg:grid-cols-[250px_1fr_120px_110px_40px] lg:items-center lg:gap-4 lg:rounded-none lg:pr-6 lg:shadow-none',
        unavailable && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-4">
        <img
          src={item.image.src}
          srcSet={item.image.srcSet}
          sizes="(min-width: 1024px) 70px, 100px"
          width={100}
          height={100}
          alt=""
          loading="lazy"
          className="size-[100px] shrink-0 rounded-[14px] object-cover lg:size-[70px] lg:rounded-[6px]"
        />
        <div className="hidden min-w-0 flex-col gap-1.5 lg:flex">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: item.nftId }}
            search={{ edition: item.editionKind }}
            className="truncate rounded-sm text-base leading-4 font-bold hover:text-kurio-accent"
          >
            {item.name}
          </Link>
          <p className="text-sm leading-4 text-text-muted">
            Edição {item.editionLabel} · {item.tokenId}
          </p>
          <LineNotice item={item} />
        </div>
      </div>

      {/* Mobile: card do Figma (nome, edição, total, quantidade e remover). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3 pr-3 lg:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/nfts/$nftId"
              params={{ nftId: item.nftId }}
              search={{ edition: item.editionKind }}
              className="block truncate rounded-sm text-[15px] leading-4 font-bold"
            >
              {item.name}
            </Link>
            <p className="mt-1.5 text-sm leading-4 text-text-secondary">Edição: {item.editionLabel}</p>
          </div>
          {removeButton}
        </div>
        <LineNotice item={item} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg leading-4 font-bold text-primary">{formatEth(item.lineTotalEth)}</p>
          {stepper}
        </div>
      </div>

      {/* Desktop: colunas Preço, Edições, Total e remover. */}
      <p className="hidden text-base leading-4 font-bold text-text-secondary lg:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPriceEth)}
      </p>
      <div className="hidden lg:block">{stepper}</div>
      <p className="hidden text-base leading-4 font-bold text-primary lg:block">
        <span className="sr-only">Total da linha: </span>
        {formatEth(item.lineTotalEth)}
      </p>
      <div className="hidden lg:block">{removeButton}</div>
    </li>
  )
}
