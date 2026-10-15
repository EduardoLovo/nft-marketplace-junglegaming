import { Link } from '@tanstack/react-router'
import type { CartItem } from '@/contracts/cart'
import { QuantityStepper } from '@/features/nft/components/quantity-stepper'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useRemoveCartItem, useUpdateCartItem } from '../hooks'
import { DeleteIcon } from './cart-icons'

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

  const stepper = (size: 'sm' | 'round') => (
    <QuantityStepper
      size={size}
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
      className="flex size-6 items-center justify-center rounded-sm text-text-secondary hover:text-coral"
    >
      <DeleteIcon className="size-6" />
    </button>
  )

  return (
    <li
      className={cn(
        'relative flex min-h-[100px] gap-[9px] rounded-[14px] bg-surface-card shadow-[0_6px_20px_rgb(10_6_4/0.45)] lg:grid lg:min-h-[70px] lg:grid-cols-[250px_77px_75px_87px_24px] lg:items-center lg:justify-between lg:gap-0 lg:rounded-none lg:pr-6 lg:shadow-none',
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
          {/* Figma: só o ID do token; a edição vai para leitores de tela. */}
          <p className="text-sm leading-4 text-text-muted">
            ID do token: {item.tokenId}
            <span className="sr-only">, edição {item.editionLabel}</span>
          </p>
          <LineNotice item={item} />
        </div>
      </div>

      {/* Mobile: card do Figma. Nome a 13px do topo, edição a 35px e total a 69px;
          a quantidade fica à direita, centralizada. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-4 lg:hidden">
        <div className="flex min-w-0 flex-1 flex-col self-stretch pt-[13px] pb-[15px]">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: item.nftId }}
            search={{ edition: item.editionKind }}
            className="block truncate rounded-sm text-[15px] leading-4 font-bold"
          >
            {item.name}
          </Link>
          <p className="mt-1.5 text-sm leading-4 text-text-secondary">Edição: {item.editionLabel}</p>
          <LineNotice item={item} />
          <p className="mt-auto text-lg leading-4 font-bold text-primary">{formatEth(item.lineTotalEth)}</p>
        </div>
        {stepper('round')}
        {/* O Figma não fixa um lugar para remover no mobile; fica no canto do card. */}
        <div className="absolute top-2 right-2">{removeButton}</div>
      </div>

      {/* Desktop: colunas Preço, Edições, Total e remover. */}
      <p className="hidden text-base leading-4 font-bold text-text-secondary lg:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPriceEth)}
      </p>
      <div className="hidden lg:block">{stepper('sm')}</div>
      <p className="hidden text-base leading-4 font-bold text-primary lg:block">
        <span className="sr-only">Total da linha: </span>
        {formatEth(item.lineTotalEth)}
      </p>
      <div className="hidden lg:block">{removeButton}</div>
    </li>
  )
}
