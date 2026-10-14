import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Cart } from '@/contracts/cart'
import { cartQueryOptions } from '@/features/cart/api'
import { CartLine } from '@/features/cart/components/cart-line'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { useAcknowledgeCart, useCart } from '@/features/cart/hooks'
import { catalogQueryOptions } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { isApiError } from '@/lib/api/errors'

export const Route = createFileRoute('/cart')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
  },
  component: CartPage,
})

function CartPage() {
  const { data: cart, isPending, isError, error, refetch } = useCart()

  useEffect(() => {
    document.title = 'Carrinho | Kurio'
    return () => {
      document.title = 'Kurio | Marketplace de NFTs'
    }
  }, [])

  return (
    <div className="flex flex-col gap-12 pt-2 lg:gap-24 lg:pt-8">
      <section aria-labelledby="cart-title" className="flex flex-col gap-3">
        <PageHeading />

        {isPending ? (
          <CartSkeleton />
        ) : isError ? (
          <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-card p-6">
            <h2 className="text-lg font-bold">Não foi possível carregar o carrinho</h2>
            <p className="text-sm text-text-secondary">{isApiError(error) ? error.message : 'Erro inesperado.'}</p>
            <Button onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-12">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[782px]">
              <ChangesNotice cart={cart} />
              <div
                aria-hidden="true"
                className="hidden grid-cols-[250px_1fr_120px_110px_40px] gap-4 border-b-[0.3px] border-primary pr-6 pb-3 text-base leading-4 lg:grid"
              >
                <span className="font-bold">NFTs</span>
                <span className="font-medium">Preço</span>
                <span className="font-bold">Edições</span>
                <span className="font-medium">Total</span>
                <span />
              </div>
              <ul aria-label="Itens do carrinho" className="flex flex-col gap-5 lg:gap-3">
                {cart.items.map((item) => (
                  <CartLine key={item.editionId} item={item} />
                ))}
              </ul>
            </div>
            <CartSummary cart={cart} />
          </div>
        )}
      </section>

      <AlsoViewed />
    </div>
  )
}

function PageHeading() {
  const router = useRouter()
  return (
    <>
      <nav aria-label="Trilha de navegação" className="hidden text-[15px] leading-4 font-bold lg:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/" className="rounded-sm hover:text-kurio-accent">
              Início
            </Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li>
            <Link to="/" hash="mercado" className="rounded-sm hover:text-kurio-accent">
              Mercado
            </Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <div className="flex items-center gap-4 lg:sr-only">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Voltar"
          className="flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised lg:hidden"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </button>
        <h1 id="cart-title" className="text-xl leading-4 font-bold">
          Carrinho de NFTs
        </h1>
      </div>
    </>
  )
}

/** Avisa que preço ou estoque mudaram e permite aceitar os novos preços de uma vez. */
function ChangesNotice({ cart }: { cart: Cart }) {
  const acknowledge = useAcknowledgeCart()
  const priceChanges = cart.items.filter((item) => item.status === 'price-changed').length
  const stockProblems = cart.items.filter(
    (item) => item.status === 'unavailable' || item.status === 'insufficient-stock',
  ).length
  if (!cart.hasIssues) return null

  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        {priceChanges > 0 && (
          <>
            {priceChanges === 1 ? 'Um item mudou de preço' : `${priceChanges} itens mudaram de preço`} desde que
            {priceChanges === 1 ? ' foi adicionado' : ' foram adicionados'}.{' '}
          </>
        )}
        {stockProblems > 0 && 'Há itens esgotados ou com estoque menor que a quantidade escolhida.'}
      </p>
      {priceChanges > 0 && (
        <Button size="sm" onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending} className="shrink-0">
          Aceitar novos preços
        </Button>
      )}
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-lg border border-border bg-surface-card px-6 py-12 text-center">
      <ShoppingCartIcon className="size-10 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
        <p className="text-sm text-text-secondary">Explore o mercado e escolha uma edição para começar a colecionar.</p>
      </div>
      <Button asChild className="h-10 px-8 font-bold uppercase">
        <Link to="/" hash="mercado">
          Explorar NFTs
        </Link>
      </Button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carrinho" className="flex flex-col gap-10 lg:flex-row lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 lg:max-w-[782px]">
        <Skeleton className="hidden h-4 w-full lg:block" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[100px] w-full rounded-[14px] lg:h-[70px] lg:rounded-none" />
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 lg:w-[332px]">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/** "Colecionadores também viram": NFTs em alta, como sugestão de continuidade. */
function AlsoViewed() {
  const { data, isPending, isError } = useQuery(
    catalogQueryOptions({ tab: 'trending', sort: 'recent', page: 1, pageSize: 5 }),
  )
  if (isError || (data && data.items.length === 0)) return null

  return (
    <section aria-labelledby="also-viewed-title" className="flex flex-col gap-8">
      <h2 id="also-viewed-title" className="border-b-[0.3px] border-primary pb-3 text-[17px] font-bold text-primary">
        Colecionadores também viram
      </h2>
      <ul
        aria-busy={isPending}
        className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5 lg:gap-7"
      >
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[45%] shrink-0 md:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : data.items.map((nft) => (
              <li key={nft.id} className="w-[45%] shrink-0 snap-start md:w-auto">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
