import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PAYMENT_NETWORKS, shortAddress, WALLET_PROVIDERS, type Wallet } from '@/contracts/wallets'
import { AccountLayout } from '@/features/account/components/account-layout'
import { useSession } from '@/features/auth/use-session'
import { useDeleteWallet, useUpdateWallet, useWallets } from '@/features/wallets/api'
import { WalletForm } from '@/features/wallets/components/wallet-form'
import { isApiError } from '@/lib/api/errors'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : 'Tente novamente em instantes.')

/** "Adicionar" do Figma: texto cobre de 16px. */
const addClass = 'rounded-sm text-base leading-4 font-medium text-primary hover:underline'
const actionClass = 'rounded-sm text-sm leading-4 text-primary hover:underline disabled:opacity-50'

/** Formulário aberto: editar uma carteira ou cadastrar a principal/secundária. */
type Editing = { mode: 'edit'; walletId: string } | { mode: 'create'; makeDefault: boolean }

/** Linha de uma carteira secundária, com as ações que o Figma não detalha. */
function SecondaryWallet({
  wallet,
  onEdit,
  onRemove,
}: {
  wallet: Wallet
  onEdit: () => void
  onRemove: () => void
}) {
  const update = useUpdateWallet()
  return (
    <li className="flex flex-col gap-2 border-b-[0.3px] border-primary py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[15px] leading-4 font-bold">{wallet.label}</p>
        <p className="text-sm leading-4 text-text-secondary">
          {WALLET_PROVIDERS[wallet.provider]} · <span title={wallet.address}>{shortAddress(wallet.address)}</span>
          {wallet.ensName && ` · ${wallet.ensName}`} · {wallet.networks.map((network) => PAYMENT_NETWORKS[network]).join(', ')}
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <button type="button" className={actionClass} onClick={onEdit} aria-label={`Editar ${wallet.label}`}>
          Editar
        </button>
        <button
          type="button"
          className={actionClass}
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
        </button>
        <button type="button" className={`${actionClass} text-coral`} onClick={onRemove} aria-label={`Remover ${wallet.label}`}>
          Remover
        </button>
      </div>
    </li>
  )
}

function WalletsPage() {
  useDocumentTitle('Carteiras')
  const user = useSession()!.user
  const { data: wallets, isPending, isError, refetch } = useWallets()
  const remove = useDeleteWallet()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [removing, setRemoving] = useState<Wallet[] | null>(null)

  const main = wallets?.find((wallet) => wallet.isDefault) ?? wallets?.[0]
  const secondary = wallets?.filter((wallet) => wallet.id !== main?.id) ?? []
  // Sem carteira, o formulário já abre para cadastrar a principal.
  const mainForm: Editing | null =
    editing?.mode === 'create' && editing.makeDefault ? editing : main ? { mode: 'edit', walletId: main.id } : { mode: 'create', makeDefault: true }
  const secondaryForm = editing && !(editing.mode === 'create' && editing.makeDefault) && !(editing.mode === 'edit' && editing.walletId === main?.id) ? editing : null

  async function removeWallets(targets: Wallet[]) {
    try {
      for (const wallet of targets) await remove.mutateAsync(wallet.id)
      toast.success(targets.length > 1 ? 'Carteiras removidas' : 'Carteira removida')
    } catch (error) {
      toast.error('Não foi possível remover', { description: errorMessage(error) })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <AccountLayout
      title="Carteira principal"
      description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
      actions={
        main && (
          <button type="button" className={addClass} onClick={() => setEditing({ mode: 'create', makeDefault: true })}>
            Adicionar
          </button>
        )
      }
    >
      {isPending ? (
        <div aria-busy="true" aria-label="Carregando carteiras" className="flex flex-col gap-3">
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
          Não foi possível carregar suas carteiras.
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <section aria-label="Carteira principal">
            {mainForm.mode === 'edit' ? (
              <WalletForm key={mainForm.walletId} wallet={main} user={user} makeDefault={false} />
            ) : (
              <WalletForm
                key="new-main"
                user={user}
                makeDefault
                onDone={() => setEditing(null)}
                onCancel={main ? () => setEditing(null) : undefined}
              />
            )}
          </section>

          {/* "Secondary Wallet" do Figma. */}
          <section aria-labelledby="secondary-wallet-title" className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="secondary-wallet-title" className="text-[17px] leading-4 font-bold">
                Carteira secundária
              </h2>
              <div className="flex items-center gap-8">
                {/* Marcado quando não há secundária: a principal recebe tudo. */}
                <label className="flex cursor-pointer items-center gap-2 text-sm leading-4 has-focus-visible:[&>span]:ring-3 has-focus-visible:[&>span]:ring-ring/50">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={secondary.length === 0}
                    disabled={!main}
                    onChange={() => secondary.length > 0 && setRemoving(secondary)}
                  />
                  <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border-[1.5px] border-primary">
                    {secondary.length === 0 && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  Igual à carteira principal
                </label>
                <button
                  type="button"
                  className={addClass}
                  disabled={!main}
                  onClick={() => setEditing({ mode: 'create', makeDefault: false })}
                  aria-label="Adicionar carteira secundária"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {secondary.length === 0 && !secondaryForm && (
              <p className="text-sm leading-[15px] text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>
            )}
            {secondary.length > 0 && (
              <ul className="flex flex-col">
                {secondary.map((wallet) => (
                  <SecondaryWallet
                    key={wallet.id}
                    wallet={wallet}
                    onEdit={() => setEditing({ mode: 'edit', walletId: wallet.id })}
                    onRemove={() => setRemoving([wallet])}
                  />
                ))}
              </ul>
            )}
            {secondaryForm && (
              <div className="pt-3">
                <WalletForm
                  key={secondaryForm.mode === 'edit' ? secondaryForm.walletId : 'new-secondary'}
                  wallet={secondaryForm.mode === 'edit' ? wallets.find((wallet) => wallet.id === secondaryForm.walletId) : undefined}
                  user={user}
                  makeDefault={false}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={removing !== null} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <DialogContent className="border border-border bg-surface-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{removing && removing.length > 1 ? 'Remover carteiras secundárias?' : 'Remover carteira?'}</DialogTitle>
            <DialogDescription>
              {removing?.map((wallet) => `${wallet.label} (${shortAddress(wallet.address)})`).join(', ')}{' '}
              {removing && removing.length > 1 ? 'deixarão' : 'deixará'} de aparecer no pagamento. A carteira principal continua.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={remove.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => removing && void removeWallets(removing)}>
              {remove.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountLayout>
  )
}
