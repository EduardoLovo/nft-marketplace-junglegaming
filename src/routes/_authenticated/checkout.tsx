import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ClockIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Quote } from '@/contracts/checkout'
import {
  PAYMENT_NETWORKS,
  WALLET_ADDRESS_PATTERN,
  WALLET_PROVIDERS,
  type PaymentNetwork,
  type Wallet,
  type WalletProvider,
} from '@/contracts/wallets'
import { useSession } from '@/features/auth/use-session'
import { useCart } from '@/features/cart/hooks'
import { useCreateOrder, useCreateQuote, useOrders } from '@/features/checkout/api'
import { PurchaseLines, PurchaseTotals } from '@/features/checkout/components/purchase-summary'
import { OrderDialog } from '@/features/checkout/components/order-dialog'
import { ReviewDialog, type ReviewState } from '@/features/checkout/components/review-dialog'
import { SelectField } from '@/features/checkout/components/select-field'
import {
  ConnectDialog,
  ProviderOptions,
  WalletCards,
  WalletConnection,
  type WalletSelection,
} from '@/features/checkout/components/wallet-panel'
import { describeQuoteChanges } from '@/features/checkout/quote-diff'
import { BackArrowIcon } from '@/features/nft/components/nft-icons'
import { useCreateWallet, useWallets, walletKeys } from '@/features/wallets/api'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/eth'
import { realtimeStore } from '@/lib/realtime/realtime-store'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/checkout')({
  // `?pedido=ord_…`: o modal de confirmação do Figma aberto sobre o pagamento.
  validateSearch: z.object({ pedido: z.string().optional().catch(undefined) }),
  component: CheckoutPage,
})

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(''))

/** ENS (com ou sem `.eth`) ou endereço 0x de uma carteira secundária. */
const ENS_OR_ADDRESS = /^([a-z0-9-]+(\.[a-z0-9-]+)*|0x[0-9a-fA-F]{40})?$/i

/** Campos do mobile: o Figma mobile não tem formulário, então vêm do perfil. */
const baseSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Use no máximo 40 caracteres.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
  username: z.string().trim(),
  profileName: z.string().trim(),
  ensName: z.string().trim().regex(ENS_OR_ADDRESS, 'Use um nome ENS ou um endereço 0x válido.').optional(),
  ensSuffix: z.string(),
  referralCode: optionalText(20, 'Use no máximo 20 caracteres.'),
  note: optionalText(500, 'Use no máximo 500 caracteres.'),
  useOther: z.boolean(),
  otherNetwork: z.string(),
  otherAddress: z.string().trim(),
  otherProvider: z.string(),
})

/** Desktop: todos os campos com asterisco no Figma são obrigatórios. */
const desktopSchema = baseSchema.superRefine((values, ctx) => {
  const require = (path: keyof typeof values, ok: boolean, message: string) => {
    if (!ok) ctx.addIssue({ code: 'custom', path: [path], message })
  }
  require('username', values.username.length >= 3, 'Informe o nome de usuário.')
  require('profileName', values.profileName.length >= 2, 'Informe o nome do perfil.')
  require('referralCode', (values.referralCode ?? '').length >= 3, 'Informe o código de indicação.')
  require('ensSuffix', values.ensSuffix === '.eth', 'Selecione o domínio ENS.')
  if (values.useOther) {
    require('otherNetwork', values.otherNetwork in PAYMENT_NETWORKS, 'Selecione uma rede.')
    require('otherAddress', WALLET_ADDRESS_PATTERN.test(values.otherAddress), 'Use um endereço 0x com 40 caracteres hexadecimais.')
    require('otherProvider', values.otherProvider in WALLET_PROVIDERS, 'Selecione uma carteira.')
  }
})

type CheckoutValues = z.infer<typeof baseSchema>

/** Layout desktop do pagamento (formulário completo); abaixo disso vale o layout mobile do Figma, sem formulário. */
const isDesktopLayout = () => window.matchMedia('(min-width: 1024px)').matches

/** A validação depende da largura no momento do envio: os campos extras do Figma só existem no desktop. */
const resolver: Resolver<CheckoutValues> = (values, context, options) =>
  zodResolver(isDesktopLayout() ? desktopSchema : baseSchema)(values, context, options)

const newIdempotencyKey = () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const NETWORK_OPTIONS = (networks: PaymentNetwork[]) => networks.map((value) => ({ value, label: PAYMENT_NETWORKS[value] }))
const PROVIDER_OPTIONS = (Object.entries(WALLET_PROVIDERS) as Array<[WalletProvider, string]>).map(([value, label]) => ({ value, label }))

/** Carteira cadastrada de um aplicativo: a principal, se for dele, ou a primeira. */
const walletOf = (wallets: Wallet[] | undefined, provider: WalletProvider) =>
  wallets?.find((wallet) => wallet.provider === provider && wallet.isDefault) ??
  wallets?.find((wallet) => wallet.provider === provider)

function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const session = useSession()
  const navigate = useNavigate()
  const router = useRouter()
  const { pedido } = Route.useSearch()
  const queryClient = useQueryClient()
  const { data: cart, isPending: cartPending } = useCart()
  const { data: wallets } = useWallets()
  const { data: orders } = useOrders()
  const createQuote = useCreateQuote()
  const createOrder = useCreateOrder()
  const createWallet = useCreateWallet()

  const [selection, setSelection] = useState<WalletSelection>({ walletId: null, network: null })
  const [walletError, setWalletError] = useState<string>()
  const [review, setReview] = useState<ReviewState | null>(null)
  // Confirmar com a carteira desconectada abre a autorização da carteira.
  const [connectPrompt, setConnectPrompt] = useState(false)

  // Carteira padrão pré-selecionada quando a lista chega.
  const defaultWallet = wallets?.find((wallet) => wallet.isDefault) ?? wallets?.[0]
  const effectiveSelection: WalletSelection =
    selection.walletId === null && defaultWallet
      ? { walletId: defaultWallet.id, network: defaultWallet.networks[0] }
      : selection
  const selectedWallet = wallets?.find((wallet) => wallet.id === effectiveSelection.walletId)


  const form = useForm<CheckoutValues>({
    resolver,
    values: {
      displayName: session?.user.name ?? '',
      email: session?.user.email ?? '',
      username: session?.user.username ?? '',
      profileName: session?.user.name ?? '',
      ensName: session?.user.ensName?.replace(/\.eth$/i, '') ?? '',
      ensSuffix: '.eth',
      referralCode: '',
      note: '',
      useOther: false,
      otherNetwork: '',
      otherAddress: '',
      otherProvider: '',
    },
    resetOptions: { keepDirtyValues: true },
  })
  const { errors } = form.formState
  const useOther = useWatch({ control: form.control, name: 'useOther' })
  const otherProvider = useWatch({ control: form.control, name: 'otherProvider' }) as WalletProvider | ''
  const provider: WalletProvider | null = useOther ? otherProvider || null : (selectedWallet?.provider ?? null)
  const pendingOrder = orders?.find((order) => order.status === 'pending')

  // Enquanto a revisão está aberta, um `nft.updated` de um dos itens invalida a
  // cotação: confirmar fica bloqueado até buscar os valores novos. O listener é
  // liberado ao fechar a revisão ou sair da página.
  // A chave muda só quando muda o conjunto de NFTs revisados, não a cada atualização da revisão.
  const reviewNftKey = review ? review.quote.lines.map((line) => line.nftId).join(',') : null
  useEffect(() => {
    if (!reviewNftKey) return
    const nftIds = new Set(reviewNftKey.split(','))
    return realtimeStore.onNftUpdated((event) => {
      if (nftIds.has(event.resource.id)) setReview((current) => current && { ...current, outdated: true })
    })
  }, [reviewNftKey])

  function selectWallet(wallet: Wallet) {
    // Mantém a rede se a nova carteira também opera nela.
    const network =
      effectiveSelection.network && wallet.networks.includes(effectiveSelection.network)
        ? effectiveSelection.network
        : wallet.networks[0]
    setSelection({ walletId: wallet.id, network })
    form.setValue('useOther', false)
    setWalletError(undefined)
  }

  /** Escolher o aplicativo seleciona a carteira cadastrada dele; sem uma, libera "outra carteira". */
  function selectProvider(next: WalletProvider) {
    setWalletError(undefined)
    if (useOther && isDesktopLayout()) {
      form.setValue('otherProvider', next, { shouldValidate: form.formState.isSubmitted })
      return
    }
    const wallet = walletOf(wallets, next)
    if (wallet) {
      selectWallet(wallet)
      return
    }
    // Sem carteira desse aplicativo: no desktop o formulário recebe os dados dela;
    // o layout mobile não tem esses campos, então orienta a cadastrar em Carteiras.
    if (!isDesktopLayout()) {
      setWalletError(`Você não tem uma carteira ${WALLET_PROVIDERS[next]} cadastrada. Use "Trocar carteira" para cadastrá-la.`)
      return
    }
    form.setValue('useOther', true)
    form.setValue('otherProvider', next)
    setWalletError(`Você não tem uma carteira ${WALLET_PROVIDERS[next]} cadastrada: informe os dados dela no formulário.`)
  }

  async function refreshReview() {
    if (!review) return
    const previous = review.quote
    const quote = await requestQuote()
    setReview(quote ? { quote, changes: describeQuoteChanges(previous, quote), idempotencyKey: newIdempotencyKey() } : null)
  }

  /** `justConnected`: a carteira acabou de autorizar (a lista ainda pode não ter atualizado). */
  async function requestQuote(justConnected = false): Promise<Quote | null> {
    if (!effectiveSelection.walletId || !effectiveSelection.network) {
      setWalletError('Selecione uma carteira e a rede de pagamento.')
      return null
    }
    if (!justConnected && !selectedWallet?.connected) {
      // Em vez de só avisar, pede a autorização; ao aprovar, a revisão abre sozinha.
      setWalletError(undefined)
      setConnectPrompt(true)
      return null
    }
    setWalletError(undefined)
    try {
      return await createQuote.mutateAsync({ walletId: effectiveSelection.walletId, network: effectiveSelection.network })
    } catch (error) {
      toast.error('Não foi possível calcular o pedido', {
        description: isApiError(error) ? error.message : 'Tente novamente em instantes.',
      })
      return null
    }
  }

  /** "Usar outra carteira?": cadastra a carteira informada e passa a usá-la (ainda falta conectar). */
  async function registerOtherWallet(values: CheckoutValues) {
    try {
      const wallet = (await createWallet.mutateAsync({
        label: 'Outra carteira',
        provider: values.otherProvider as WalletProvider,
        address: values.otherAddress,
        ensName: null,
        networks: [values.otherNetwork as PaymentNetwork],
        isDefault: false,
      })) as Wallet
      setSelection({ walletId: wallet.id, network: wallet.networks[0] })
      form.setValue('useOther', false)
      form.setValue('otherAddress', '')
      setWalletError(`Carteira cadastrada. Conecte a ${WALLET_PROVIDERS[wallet.provider]} para revisar o pedido.`)
    } catch (error) {
      if (isApiError(error) && (error.fields.address || error.fields.networks)) {
        if (error.fields.address) form.setError('otherAddress', { message: error.fields.address })
        if (error.fields.networks) form.setError('otherNetwork', { message: error.fields.networks })
      } else toast.error('Não foi possível cadastrar a carteira', { description: isApiError(error) ? error.message : undefined })
    }
  }

  const submit = (justConnected = false) => form.handleSubmit(async (values) => {
    if (values.useOther) {
      // Só o desktop tem os campos da outra carteira (a janela pode ter sido estreitada depois).
      if (isDesktopLayout()) await registerOtherWallet(values)
      else {
        form.setValue('useOther', false)
        setWalletError('Para usar outra carteira, cadastre-a em "Trocar carteira".')
      }
      return
    }
    const quote = await requestQuote(justConnected)
    // Cada cotação tem sua própria chave: reenviar a mesma confirmação nunca duplica o pedido.
    if (quote) setReview({ quote, changes: null, idempotencyKey: newIdempotencyKey() })
  })
  const openReview = submit()

  function confirm() {
    if (!review) return
    const values = form.getValues()
    // "ENS ou carteira secundária" + domínio do "Nome ENS"; um endereço 0x não é ENS.
    const ens = values.ensName && !values.ensName.startsWith('0x')
      ? values.ensName.toLowerCase().endsWith('.eth') ? values.ensName : `${values.ensName}${values.ensSuffix}`
      : undefined
    createOrder.mutate(
      {
        input: {
          quoteId: review.quote.id,
          displayName: values.displayName,
          email: values.email,
          username: values.username || undefined,
          profileName: values.profileName || undefined,
          ensName: ens,
          referralCode: values.referralCode || undefined,
          note: values.note || undefined,
        },
        idempotencyKey: review.idempotencyKey,
      },
      {
        onSuccess: (order) => {
          setReview(null)
          void navigate({ to: '/checkout', search: { pedido: order.id } })
        },
        onError: async (error) => {
          if (!isApiError(error)) return
          // Cotação vencida ou valores alterados: recalcula e pede nova confirmação.
          if (error.code === 'CONFLICT' && error.fields.quote) {
            const previous = review.quote
            const quote = await requestQuote()
            if (quote) {
              setReview({ quote, changes: describeQuoteChanges(previous, quote), idempotencyKey: newIdempotencyKey() })
            } else {
              setReview(null)
            }
            return
          }
          if (error.code === 'CONFLICT' && error.fields.walletId) {
            setReview(null)
            setWalletError(error.message)
            void queryClient.invalidateQueries({ queryKey: walletKeys.all })
            return
          }
          if (error.code === 'VALIDATION_ERROR') {
            setReview(null)
            for (const [field, message] of Object.entries(error.fields)) {
              if (field in baseSchema.shape) form.setError(field as keyof CheckoutValues, { message })
            }
            return
          }
          toast.error('Não foi possível criar o pedido', { description: error.message })
        },
      },
    )
  }

  if (cartPending) {
    return (
      <div aria-busy="true" aria-label="Carregando pagamento" className="flex flex-col gap-6 pt-8 lg:flex-row">
        <Skeleton className="h-[600px] flex-1" />
        <Skeleton className="h-[600px] w-full lg:w-[405px]" />
      </div>
    )
  }

  // Só falta de estoque impede seguir; preço alterado aparece na revisão para reconfirmar.
  const stockProblem = cart?.items.some((item) => item.status === 'unavailable' || item.status === 'insufficient-stock')
  const cartBlocked = !cart || cart.summary.itemCount === 0 || stockProblem
  const submitting = createQuote.isPending || createWallet.isPending
  const walletErrorText = walletError && (
    <p role="alert" className="text-xs text-coral">
      {walletError}
    </p>
  )

  return (
    // Mobile: topo a 32px, como no Figma (a margem padrão é 40px).
    <div className="-mt-2 flex flex-col gap-8 max-lg:px-1 lg:mt-0 lg:pt-8">
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
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      {/* "Screen Header" do mobile: voltar de 35px e o título 24px à direita. */}
      <div className="flex h-11 items-start gap-6 lg:sr-only">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Voltar"
          className="flex size-[35px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised lg:hidden"
        >
          <BackArrowIcon className="size-5" />
        </button>
        <h1 className="pt-[9px] text-xl leading-4 font-bold">Pagamento com carteira</h1>
      </div>

      {pendingOrder && (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ClockIcon className="size-4 text-amber" aria-hidden="true" />
            Você tem um pedido em processamento. Acompanhe-o antes de comprar de novo.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/checkout" search={{ pedido: pendingOrder.id }}>
              Ver pedido
            </Link>
          </Button>
        </div>
      )}

      {cartBlocked ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-card p-6">
          <h2 className="text-lg font-bold">
            {cart && cart.summary.itemCount > 0 ? 'Revise seu carrinho antes de pagar' : 'Seu carrinho está vazio'}
          </h2>
          <p className="text-sm text-text-secondary">
            {cart && cart.summary.itemCount > 0
              ? 'Há itens esgotados ou com estoque menor que a quantidade escolhida.'
              : 'Adicione NFTs ao carrinho para finalizar uma compra.'}
          </p>
          <Button asChild>
            <Link to={cart && cart.summary.itemCount > 0 ? '/cart' : '/'}>
              {cart && cart.summary.itemCount > 0 ? 'Ir para o carrinho' : 'Explorar NFTs'}
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={openReview} noValidate className="-mt-4 flex flex-col lg:mt-0 lg:flex-row lg:gap-8">
          {/* Desktop: "Perfil do colecionador" com as duas colunas de campos do Figma. */}
          <section aria-labelledby="buyer-title" className="hidden w-[763px] shrink-0 flex-col gap-3 lg:flex">
            <h2 id="buyer-title" className="text-[17px] leading-4 font-bold">
              Perfil do colecionador
            </h2>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-x-6">
                <div className="flex flex-col gap-3">
                  <TextField variant="checkout" label="Nome de exibição" required autoComplete="nickname" error={errors.displayName?.message} {...form.register('displayName')} />
                  {useOther ? (
                    <>
                      <SelectField key="other-network" label="Rede" required placeholder="Selecione uma rede" options={NETWORK_OPTIONS(['ethereum', 'polygon'])} error={errors.otherNetwork?.message} {...form.register('otherNetwork')} />
                      <TextField key="other-address" variant="checkout" label="Endereço da carteira" required placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} error={errors.otherAddress?.message} {...form.register('otherAddress')} />
                      <SelectField key="other-provider" label="Tipo de carteira" required placeholder="Selecione uma carteira" options={PROVIDER_OPTIONS} error={errors.otherProvider?.message} {...form.register('otherProvider')} />
                    </>
                  ) : (
                    <>
                      {/* Carteira cadastrada: rede escolhida entre as dela; endereço e tipo vêm dela.
                          As keys separam estes campos (controlados) dos de "outra carteira" (do formulário). */}
                      <SelectField
                        key="wallet-network"
                        label="Rede"
                        required
                        placeholder="Selecione uma rede"
                        options={NETWORK_OPTIONS(selectedWallet?.networks ?? [])}
                        value={effectiveSelection.network ?? ''}
                        onChange={(event) => setSelection({ ...effectiveSelection, network: event.target.value as PaymentNetwork })}
                      />
                      <TextField key="wallet-address" variant="checkout" label="Endereço da carteira" required readOnly placeholder="Endereço 0x da carteira" value={selectedWallet?.address ?? ''} />
                      <SelectField
                        key="wallet-provider"
                        label="Tipo de carteira"
                        required
                        placeholder="Selecione uma carteira"
                        options={PROVIDER_OPTIONS}
                        value={provider ?? ''}
                        onChange={(event) => selectProvider(event.target.value as WalletProvider)}
                      />
                    </>
                  )}
                  <TextField variant="checkout" label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
                </div>
                <div className="flex flex-col gap-3">
                  <TextField variant="checkout" label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
                  <TextField variant="checkout" label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
                  {/* No Figma este campo não tem rótulo visível: só o placeholder, alinhado à base. */}
                  <TextField
                    variant="checkout"
                    label="ENS ou carteira secundária (opcional)"
                    hideLabel
                    placeholder="ENS ou carteira secundária (opcional)"
                    className="pt-[29px]"
                    error={errors.ensName?.message}
                    {...form.register('ensName')}
                  />
                  <TextField variant="checkout" label="Código de indicação" required error={errors.referralCode?.message} {...form.register('referralCode')} />
                  <SelectField label="Nome ENS" required className="w-[78px]" options={[{ value: '.eth', label: '.eth' }]} error={errors.ensSuffix?.message} {...form.register('ensSuffix')} />
                </div>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2 text-[15px] leading-4 has-focus-visible:[&>span]:ring-3 has-focus-visible:[&>span]:ring-ring/50">
                <input type="checkbox" className="sr-only" {...form.register('useOther', { onChange: () => setWalletError(undefined) })} />
                {/* Círculo de 15px com borda cobre do Figma; preenchido quando ativo. */}
                <span aria-hidden="true" className="flex size-[15px] items-center justify-center rounded-full border-2 border-primary">
                  {useOther && <span className="size-[7px] rounded-full bg-primary" />}
                </span>
                Usar outra carteira?
              </label>

              <div className="flex w-[350px] flex-col gap-3">
                <label htmlFor="checkout-note" className="text-[15px] leading-[15px]">
                  Observação do colecionador (opcional)
                </label>
                <textarea
                  id="checkout-note"
                  aria-invalid={errors.note ? true : undefined}
                  aria-describedby={errors.note ? 'checkout-note-error' : undefined}
                  className="h-[152px] resize-none rounded-[3px] border border-border bg-transparent p-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  {...form.register('note')}
                />
                {errors.note && (
                  <p id="checkout-note-error" className="text-xs text-coral">
                    {errors.note.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Desktop: "Seus NFTs", totais, "Carteira e rede" e confirmar. */}
          <aside aria-labelledby="your-nfts-title" className="hidden w-[405px] shrink-0 flex-col gap-3 lg:flex">
            <h2 id="your-nfts-title" className="text-[17px] leading-4 font-bold">
              Seus NFTs
            </h2>
            <PurchaseLines withHeader lines={cart.items} />
            <Link to="/cart" className="text-center text-sm leading-4 hover:text-primary">
              Tem um código promocional? Aplique aqui
            </Link>
            <PurchaseTotals summary={cart.summary} couponCode={cart.coupon?.valid ? cart.coupon.code : null} />
            <section aria-labelledby="wallet-title" className="flex flex-col gap-[19px] pt-3">
              <h2 id="wallet-title" className="text-center text-[17px] leading-4 font-bold">
                Carteira e rede
              </h2>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <ProviderOptions name="provider-desktop" variant="desktop" value={provider} onChange={selectProvider} />
                  {!useOther && <WalletConnection wallet={selectedWallet} network={effectiveSelection.network} />}
                  {walletErrorText}
                </div>
                {/* Abre a revisão; a compra só é enviada ao confirmar dentro dela. */}
                <Button type="submit" disabled={submitting} className="h-[45px] w-full rounded-lg text-[15px] leading-4 font-bold">
                  {submitting ? 'Calculando…' : 'Confirmar compra'}
                </Button>
              </div>
            </section>
          </aside>

          {/* Mobile ("Mobile / Pagamento"): carteiras cadastradas, aplicativos, total e confirmar. */}
          <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-base leading-4 font-bold">Carteira conectada</h2>
              <Link to="/wallets" className="rounded-sm text-sm leading-4 font-bold text-primary">
                Trocar carteira
              </Link>
            </div>
            {wallets && wallets.length > 0 ? (
              <WalletCards wallets={wallets} selectedId={effectiveSelection.walletId} onSelect={selectWallet} />
            ) : (
              <p className="text-sm text-text-secondary">
                Você ainda não tem carteiras.{' '}
                <Link to="/wallets" className="text-primary underline">
                  Cadastrar carteira
                </Link>
              </p>
            )}
            <section aria-labelledby="wallet-title-mobile" className="flex flex-col gap-4">
              <h2 id="wallet-title-mobile" className="text-base leading-4 font-bold">
                Carteira e rede
              </h2>
              <ProviderOptions name="provider-mobile" variant="mobile" value={provider} onChange={selectProvider} />
              <WalletConnection wallet={selectedWallet} network={effectiveSelection.network} />
              {walletErrorText}
            </section>
            <p className="flex justify-end gap-7 leading-4">
              <span className="text-base font-bold">Total:</span>
              <span className="text-lg font-bold text-kurio-accent">{formatEth(cart.summary.totalEth)}</span>
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className={cn(
                'mt-auto h-[60px] w-full rounded-[40px] bg-linear-to-b from-primary to-primary/80 text-[15px] leading-4 font-bold text-ink',
              )}
            >
              {submitting ? 'Calculando…' : 'Confirmar compra'}
            </Button>
          </div>
        </form>
      )}

      {selectedWallet && effectiveSelection.network && (
        <ConnectDialog
          wallet={selectedWallet}
          network={effectiveSelection.network}
          open={connectPrompt}
          onOpenChange={setConnectPrompt}
          onConnected={() => void submit(true)()}
        />
      )}

      {pedido && (
        <OrderDialog orderId={pedido} onClose={() => void navigate({ to: '/checkout', search: {}, replace: true })} />
      )}

      <ReviewDialog
        review={review}
        wallet={selectedWallet}
        contact={{ displayName: form.getValues('displayName'), email: form.getValues('email') }}
        submitting={createOrder.isPending}
        onConfirm={confirm}
        onRefresh={refreshReview}
        refreshing={createQuote.isPending}
        onClose={() => setReview(null)}
      />
    </div>
  )
}
