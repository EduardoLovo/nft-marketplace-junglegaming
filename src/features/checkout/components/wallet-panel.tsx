import { Link } from '@tanstack/react-router'
import { CheckCircle2Icon, Loader2Icon, PlugZapIcon, UnplugIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PAYMENT_NETWORKS,
  shortAddress,
  WALLET_PROVIDERS,
  type PaymentNetwork,
  type Wallet,
} from '@/contracts/wallets'
import { useConnectWallet, useDisconnectWallet, useWallets } from '@/features/wallets/api'
import { isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

/**
 * Popup que simula a extensão da carteira pedindo autorização. "Rejeitar"
 * acontece só na carteira (o servidor nem é chamado), como numa extensão real.
 */
function ConnectDialog({
  wallet,
  network,
  open,
  onOpenChange,
}: {
  wallet: Wallet
  network: PaymentNetwork
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const connect = useConnectWallet()

  function approve() {
    connect.mutate(wallet.id, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success(`${WALLET_PROVIDERS[wallet.provider]} conectada`)
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

export interface WalletSelection {
  walletId: string | null
  network: PaymentNetwork | null
}

/** "Carteira e rede": escolha da carteira cadastrada, da rede e da conexão. */
export function WalletPanel({
  value,
  onChange,
  error,
}: {
  value: WalletSelection
  onChange: (value: WalletSelection) => void
  error?: string
}) {
  const { data: wallets, isPending, isError, refetch } = useWallets()
  const disconnect = useDisconnectWallet()
  const [connecting, setConnecting] = useState(false)
  const networkId = useId()
  const errorId = useId()

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando carteiras" className="flex flex-col gap-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }
  if (isError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        Não foi possível carregar suas carteiras.
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  if (wallets.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 text-sm">
        <p>Você ainda não tem carteiras cadastradas.</p>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/wallets">Cadastrar carteira</Link>
        </Button>
      </div>
    )
  }

  const selected = wallets.find((wallet) => wallet.id === value.walletId) ?? null

  function selectWallet(wallet: Wallet) {
    // Mantém a rede se a nova carteira também opera nela.
    const network = value.network && wallet.networks.includes(value.network) ? value.network : wallet.networks[0]
    onChange({ walletId: wallet.id, network })
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-2">
        <legend className="sr-only">Carteira de pagamento</legend>
        {wallets.map((wallet) => (
          <label
            key={wallet.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              wallet.id === value.walletId ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
          >
            <input
              type="radio"
              name="wallet"
              value={wallet.id}
              checked={wallet.id === value.walletId}
              onChange={() => selectWallet(wallet)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-primary"
            >
              {WALLET_PROVIDERS[wallet.provider][0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-sm">
              <span className="font-medium">
                {WALLET_PROVIDERS[wallet.provider]} · {wallet.label}
              </span>
              <span className="truncate text-xs text-text-muted">
                {wallet.ensName ?? shortAddress(wallet.address)}
              </span>
            </span>
            {wallet.connected && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2Icon className="size-4" aria-hidden="true" />
                Conectada
              </span>
            )}
          </label>
        ))}
      </fieldset>

      {selected && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={networkId} className="text-sm font-medium">
            Rede
          </label>
          <select
            id={networkId}
            value={value.network ?? ''}
            onChange={(event) => onChange({ ...value, network: event.target.value as PaymentNetwork })}
            className="h-10 rounded-[3px] border border-border bg-surface-card px-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            {selected.networks.map((network) => (
              <option key={network} value={network}>
                {PAYMENT_NETWORKS[network]}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected &&
        value.network &&
        (selected.connected ? (
          <Button
            variant="outline"
            onClick={() => disconnect.mutate(selected.id)}
            disabled={disconnect.isPending}
            className="w-full"
          >
            <UnplugIcon aria-hidden="true" />
            Desconectar {WALLET_PROVIDERS[selected.provider]}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setConnecting(true)} className="w-full border-primary text-primary">
              <PlugZapIcon aria-hidden="true" />
              Conectar {WALLET_PROVIDERS[selected.provider]}
            </Button>
            <ConnectDialog wallet={selected} network={value.network} open={connecting} onOpenChange={setConnecting} />
          </>
        ))}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}

      <Link to="/wallets" className="w-fit rounded-sm text-sm text-primary hover:underline">
        Usar outra carteira?
      </Link>
    </div>
  )
}
