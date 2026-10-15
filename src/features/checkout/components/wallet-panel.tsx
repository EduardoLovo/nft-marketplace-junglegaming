import { Link } from '@tanstack/react-router'
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  PAYMENT_NETWORKS,
  shortAddress,
  WALLET_PROVIDERS,
  type PaymentNetwork,
  type Wallet,
  type WalletProvider,
} from '@/contracts/wallets'
import { useConnectWallet, useDisconnectWallet } from '@/features/wallets/api'
import { isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { WalletIcon } from './checkout-icons'

export interface WalletSelection {
  walletId: string | null
  network: PaymentNetwork | null
}

/** Ordem das opções de "Carteira e rede" no Figma (desktop e mobile). */
const PROVIDER_ORDER: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

/** Rede como aparece nos cards do mobile ("Rede Polygon", "Rede principal Ethereum"). */
const NETWORK_CAPTION: Record<PaymentNetwork, string> = {
  ethereum: 'Rede principal Ethereum',
  polygon: 'Rede Polygon',
}

/**
 * Popup que simula a extensão da carteira pedindo autorização. "Rejeitar"
 * acontece só na carteira (o servidor nem é chamado), como numa extensão real.
 */
export function ConnectDialog({
  wallet,
  network,
  open,
  onOpenChange,
  onConnected,
}: {
  wallet: Wallet
  network: PaymentNetwork
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamado ao aprovar: o pagamento usa para seguir direto para a revisão. */
  onConnected?: () => void
}) {
  const connect = useConnectWallet()

  function approve() {
    connect.mutate(wallet.id, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success(`${WALLET_PROVIDERS[wallet.provider]} conectada`)
        onConnected?.()
      },
    })
  }

  function reject() {
    onOpenChange(false)
    toast.warning('Conexão recusada na carteira', { description: 'Nenhuma permissão foi concedida.' })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : reject())}>
      <DialogContent showCloseButton={false} className="border border-border bg-surface-card sm:max-w-md">
        <DialogHeader>
          <p className="text-xs font-bold tracking-wide text-kurio-accent uppercase">
            {WALLET_PROVIDERS[wallet.provider]} · simulação
          </p>
          <DialogTitle className="text-lg">Conectar à Kurio?</DialogTitle>
          <DialogDescription>
            A Kurio poderá ver o endereço {shortAddress(wallet.address)} e solicitar transações na rede{' '}
            {PAYMENT_NETWORKS[network]}. Nenhum valor é movimentado sem a sua confirmação.
          </DialogDescription>
        </DialogHeader>
        {connect.isError && (
          <p role="alert" className="rounded-md border border-coral/40 bg-coral/10 p-3 text-sm text-coral">
            {isApiError(connect.error) ? connect.error.message : 'Não foi possível conectar.'} Tente novamente.
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={reject} disabled={connect.isPending}>
            Rejeitar
          </Button>
          <Button onClick={approve} disabled={connect.isPending}>
            {connect.isPending ? (
              <>
                <Loader2Icon className="animate-spin" aria-hidden="true" />
                Conectando…
              </>
            ) : (
              'Aprovar conexão'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Círculo de seleção do Figma: anel cobre (ou escuro, no mobile) e ponto cobre quando marcado. */
function RadioMark({ checked, size, idleClass }: { checked: boolean; size: 'sm' | 'lg'; idleClass: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.2px]',
        checked ? 'border-primary' : idleClass,
      )}
    >
      {checked && <span className={cn('rounded-full bg-primary', size === 'lg' ? 'size-2.5' : 'size-2')} />}
    </span>
  )
}

/**
 * Conexão simulada exigida pelo desafio (conectar, recusar, desconectar). O Figma
 * não desenha este controle: ele fica discreto, logo abaixo das opções.
 */
export function WalletConnection({ wallet, network }: { wallet: Wallet | undefined; network: PaymentNetwork | null }) {
  const disconnect = useDisconnectWallet()
  const [connecting, setConnecting] = useState(false)
  if (!wallet || !network) return null

  return wallet.connected ? (
    <p className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-success">
        <CheckCircle2Icon className="size-4" aria-hidden="true" />
        {WALLET_PROVIDERS[wallet.provider]} conectada
      </span>
      <button
        type="button"
        onClick={() => disconnect.mutate(wallet.id)}
        disabled={disconnect.isPending}
        className="rounded-sm text-text-secondary underline-offset-4 hover:text-coral hover:underline"
      >
        Desconectar
      </button>
    </p>
  ) : (
    <>
      <button
        type="button"
        onClick={() => setConnecting(true)}
        className="w-fit rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline"
      >
        Conectar {WALLET_PROVIDERS[wallet.provider]}
      </button>
      <ConnectDialog wallet={wallet} network={network} open={connecting} onOpenChange={setConnecting} />
    </>
  )
}

/**
 * "Carteira e rede": aplicativos de carteira. Desktop: linhas de 45px com borda
 * (a primeira mostra o selo das marcas). Mobile: cards de 65px com ícone de 40px.
 */
export function ProviderOptions({
  value,
  onChange,
  name,
  variant,
}: {
  value: WalletProvider | null
  onChange: (provider: WalletProvider) => void
  name: string
  variant: 'desktop' | 'mobile'
}) {
  return (
    <fieldset className={cn('flex flex-col', variant === 'desktop' ? 'gap-[15px]' : 'gap-4')}>
      <legend className="sr-only">Aplicativo de carteira</legend>
      {PROVIDER_ORDER.map((provider) => {
        const checked = value === provider
        const input = (
          <input
            type="radio"
            name={name}
            value={provider}
            checked={checked}
            onChange={() => onChange(provider)}
            className="sr-only"
          />
        )
        if (variant === 'desktop') {
          return (
            <label
              key={provider}
              className={cn(
                'flex h-[45px] cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                checked ? 'border-primary' : 'border-border hover:border-primary/50',
              )}
            >
              {input}
              <RadioMark checked={checked} size="lg" idleClass="border-primary" />
              {provider === 'walletconnect' ? (
                // Primeira linha do Figma: o selo das marcas, com o nome para leitores de tela.
                <span className="flex h-[26px] items-center rounded-[6px] border border-border-strong bg-surface-dark pr-px pl-2 text-[9px] font-bold whitespace-pre text-kurio-accent">
                  <span className="sr-only">WalletConnect: </span>
                  {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
                </span>
              ) : (
                <span className="text-[15px] leading-4">{WALLET_PROVIDERS[provider]}</span>
              )}
            </label>
          )
        }
        return (
          <label
            key={provider}
            className="flex h-[65px] cursor-pointer items-center gap-[11px] rounded-[15px] bg-surface-card pr-4 pl-3.5 shadow-[0_0_20px_rgb(10_6_4/0.45)] has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            {input}
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-sm font-bold text-kurio-accent"
            >
              {provider === 'coinbase' ? <WalletIcon className="size-6 text-success" /> : WALLET_PROVIDERS[provider][0]}
            </span>
            <span className="flex-1 text-sm leading-4">{WALLET_PROVIDERS[provider]}</span>
            <RadioMark checked={checked} size="sm" idleClass="border-border-strong" />
          </label>
        )
      })}
    </fieldset>
  )
}

/** "Carteira conectada" do mobile: cards das carteiras cadastradas (358x93, raio 14). */
export function WalletCards({
  wallets,
  selectedId,
  onSelect,
}: {
  wallets: Wallet[]
  selectedId: string | null
  onSelect: (wallet: Wallet) => void
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="sr-only">Carteira cadastrada</legend>
      {wallets.map((wallet) => {
        const checked = wallet.id === selectedId
        return (
          <div
            key={wallet.id}
            className={cn(
              'relative flex min-h-[93px] items-start gap-[19px] rounded-[14px] bg-surface-card pt-[15px] pr-8 pb-3 pl-[19px]',
              checked && 'shadow-[0_20px_20px_rgb(10_6_4/0.45)]',
            )}
          >
            <label className="flex flex-1 cursor-pointer items-start gap-[19px] has-focus-visible:[&>span:first-of-type]:ring-3 has-focus-visible:[&>span:first-of-type]:ring-ring/50">
              <input
                type="radio"
                name="mobile-wallet"
                value={wallet.id}
                checked={checked}
                onChange={() => onSelect(wallet)}
                className="sr-only"
              />
              <span className="mt-6 flex">
                <RadioMark checked={checked} size="sm" idleClass="border-border-strong" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base leading-4 font-bold">{wallet.label}</span>
                <span className="mt-[7px] truncate text-sm leading-[22px] text-text-secondary">
                  {wallet.ensName ?? shortAddress(wallet.address)}
                </span>
                <span className="text-sm leading-[22px] text-text-secondary">{NETWORK_CAPTION[wallet.networks[0]]}</span>
              </span>
            </label>
            {/* Os três pontos do Figma levam ao cadastro de carteiras. */}
            <Link
              to="/wallets"
              aria-label={`Gerenciar a carteira ${wallet.label}`}
              className="absolute top-[33px] right-3 flex h-6 w-5 flex-col items-center justify-center gap-[3px] rounded-sm"
            >
              {[0, 1, 2].map((dot) => (
                <span key={dot} aria-hidden="true" className="size-[3px] rounded-full bg-text-secondary" />
              ))}
            </Link>
          </div>
        )
      })}
    </fieldset>
  )
}
