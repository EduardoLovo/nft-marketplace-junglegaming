import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2Icon, PlusIcon, StarIcon, WalletIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PAYMENT_NETWORKS, shortAddress, WALLET_PROVIDERS, type Wallet } from '@/contracts/wallets'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useDeleteWallet, useUpdateWallet, useWallets } from '@/features/wallets/api'
import { WalletFormDialog } from '@/features/wallets/components/wallet-form-dialog'
import { isApiError } from '@/lib/api/errors'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : 'Tente novamente em instantes.')

function WalletCard({ wallet, onEdit, onRemove }: { wallet: Wallet; onEdit: () => void; onRemove: () => void }) {
  const update = useUpdateWallet()

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-surface-card p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-base font-bold text-primary"
      >
        {WALLET_PROVIDERS[wallet.provider][0]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2 font-bold">
          {wallet.label}
          {wallet.isDefault && (
            <span className="flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[11px] font-medium text-ink uppercase">
              <StarIcon className="size-3 fill-current" aria-hidden="true" />
              Principal
            </span>
          )}
          {wallet.connected && (
            <span className="flex items-center gap-1 text-xs font-normal text-success">
              <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
              Conectada
            </span>
          )}
        </p>
        <p className="text-sm text-text-secondary">
          {WALLET_PROVIDERS[wallet.provider]} · <span title={wallet.address}>{shortAddress(wallet.address)}</span>
          {wallet.ensName && ` · ${wallet.ensName}`}
        </p>
        <p className="text-xs text-text-muted">
          Redes: {wallet.networks.map((network) => PAYMENT_NETWORKS[network]).join(', ')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!wallet.isDefault && (
          <Button
            variant="outline"
            size="sm"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: wallet.id, input: { isDefault: true } },
                {
                  onSuccess: () => toast.success(`${wallet.label} agora é a carteira principal`),
                  onError: (error) => toast.error('Não foi possível alterar', { description: errorMessage(error) }),
                },
              )
            }
          >
            Tornar principal
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onEdit} aria-label={`Editar ${wallet.label}`}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remover ${wallet.label}`} className="text-coral">
          Remover
        </Button>
      </div>
    </li>
  )
}

function WalletsPage() {
  useDocumentTitle('Carteiras')
  const { data: wallets, isPending, isError, refetch } = useWallets()
  const remove = useDeleteWallet()
  const [editing, setEditing] = useState<Wallet | 'new' | null>(null)
  const [removing, setRemoving] = useState<Wallet | null>(null)

  const main = wallets?.filter((wallet) => wallet.isDefault) ?? []
  const secondary = wallets?.filter((wallet) => !wallet.isDefault) ?? []

  return (
    <AccountLayout title="Carteiras">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
        <Button onClick={() => setEditing('new')} className="w-fit">
          <PlusIcon aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label="Carregando carteiras" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
          Não foi possível carregar suas carteiras.
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : wallets.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-card p-6">
          <WalletIcon className="size-8 text-primary" aria-hidden="true" />
          <h2 className="font-bold">Nenhuma carteira cadastrada</h2>
          <p className="text-sm text-text-secondary">Adicione uma carteira para comprar e receber NFTs.</p>
          <Button onClick={() => setEditing('new')}>Adicionar carteira</Button>
        </div>
      ) : (
        <>
          <section aria-labelledby="main-wallet-title" className="flex flex-col gap-3">
            <h2 id="main-wallet-title" className="text-base font-bold">
              Carteira principal
            </h2>
            <ul className="flex flex-col gap-3">
              {main.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} onEdit={() => setEditing(wallet)} onRemove={() => setRemoving(wallet)} />
              ))}
            </ul>
          </section>
          <section aria-labelledby="secondary-wallet-title" className="flex flex-col gap-3">
            <h2 id="secondary-wallet-title" className="text-base font-bold">
              Carteira secundária
            </h2>
            {secondary.length === 0 ? (
              <p className="text-sm text-text-muted">Você ainda não adicionou uma carteira secundária.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {secondary.map((wallet) => (
                  <WalletCard key={wallet.id} wallet={wallet} onEdit={() => setEditing(wallet)} onRemove={() => setRemoving(wallet)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <WalletFormDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        wallet={editing && editing !== 'new' ? editing : undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        isFirst={(wallets?.length ?? 0) === 0}
      />

      <Dialog open={removing !== null} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <DialogContent className="border border-border bg-surface-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover carteira?</DialogTitle>
            <DialogDescription>
              {removing && `${removing.label} (${shortAddress(removing.address)}) deixará de aparecer no pagamento.`}
              {removing?.isDefault && ' A próxima carteira da lista passará a ser a principal.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={remove.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    toast.success('Carteira removida')
                    setRemoving(null)
                  },
                  onError: (error) => {
                    setRemoving(null)
                    toast.error('Não foi possível remover', { description: errorMessage(error) })
                  },
                })
              }
            >
              {remove.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountLayout>
  )
}
