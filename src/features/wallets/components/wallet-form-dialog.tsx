import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ENS_PATTERN } from '@/contracts/auth'
import {
  PAYMENT_NETWORKS,
  WALLET_ADDRESS_PATTERN,
  WALLET_PROVIDERS,
  type PaymentNetwork,
  type Wallet,
  type WalletProvider,
} from '@/contracts/wallets'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { useCreateWallet, useUpdateWallet } from '../api'

const walletSchema = z.object({
  label: z.string().trim().min(2, 'Use de 2 a 24 caracteres.').max(24, 'Use de 2 a 24 caracteres.'),
  provider: z.enum(Object.keys(WALLET_PROVIDERS) as [WalletProvider, ...WalletProvider[]], {
    message: 'Selecione o tipo de carteira.',
  }),
  address: z.string().trim().regex(WALLET_ADDRESS_PATTERN, 'Informe um endereço 0x com 40 caracteres hexadecimais.'),
  ensName: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || ENS_PATTERN.test(value), 'Use um nome ENS válido, terminado em .eth.'),
  networks: z.array(z.enum(Object.keys(PAYMENT_NETWORKS) as [PaymentNetwork, ...PaymentNetwork[]])).min(1, 'Selecione ao menos uma rede.'),
  isDefault: z.boolean(),
})

type WalletValues = z.infer<typeof walletSchema>

/** Diálogo de cadastro (sem `wallet`) ou edição de carteira. */
export function WalletFormDialog({
  wallet,
  open,
  onOpenChange,
  isFirst,
}: {
  wallet?: Wallet
  open: boolean
  onOpenChange: (open: boolean) => void
  isFirst: boolean
}) {
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const providerId = useId()
  const networksErrorId = useId()
  const editing = Boolean(wallet)

  const form = useForm<WalletValues>({
    resolver: zodResolver(walletSchema),
    values: {
      label: wallet?.label ?? '',
      provider: wallet?.provider ?? ('' as WalletProvider),
      address: wallet?.address ?? '',
      ensName: wallet?.ensName ?? '',
      networks: wallet?.networks ?? ['ethereum'],
      isDefault: wallet?.isDefault ?? isFirst,
    },
  })
  const { errors } = form.formState
  const pending = create.isPending || update.isPending

  const onSubmit = form.handleSubmit((values) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(editing ? 'Carteira atualizada' : 'Carteira adicionada')
        onOpenChange(false)
        form.reset()
      },
      onError: (error: unknown) => {
        if (!applyApiFieldErrors(form, error, ['label', 'provider', 'address', 'ensName', 'networks', 'isDefault'])) {
          toast.error('Não foi possível salvar a carteira', {
            description: isApiError(error) ? error.message : 'Tente novamente em instantes.',
          })
        }
      },
    }
    const ensName = values.ensName || null
    if (wallet) {
      update.mutate(
        { id: wallet.id, input: { label: values.label, ensName, networks: values.networks, isDefault: values.isDefault || undefined } },
        callbacks,
      )
    } else {
      create.mutate({ ...values, ensName }, callbacks)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border border-border bg-surface-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar carteira' : 'Adicionar carteira'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Endereço e tipo não mudam. Para usar outra carteira, cadastre-a separadamente.'
              : 'A carteira fica disponível no pagamento e para receber os NFTs comprados.'}
          </DialogDescription>
        </DialogHeader>

        <form id="wallet-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <TextField label="Apelido da carteira" placeholder="Ex.: Principal" error={errors.label?.message} {...form.register('label')} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={providerId} className="text-sm font-medium">
              Tipo de carteira
            </label>
            <select
              id={providerId}
              disabled={editing}
              aria-invalid={errors.provider ? true : undefined}
              aria-describedby={errors.provider ? `${providerId}-error` : undefined}
              className="h-10 rounded-[5px] border border-border bg-surface-card px-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
              {...form.register('provider')}
            >
              <option value="" disabled>
                Selecione uma carteira
              </option>
              {(Object.entries(WALLET_PROVIDERS) as Array<[WalletProvider, string]>).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.provider && (
              <p id={`${providerId}-error`} className="text-xs text-coral">
                {errors.provider.message}
              </p>
            )}
          </div>

          <TextField
            label="Endereço da carteira"
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            disabled={editing}
            error={errors.address?.message}
            {...form.register('address')}
          />
          <TextField label="Nome ENS (opcional)" placeholder="seunome.eth" error={errors.ensName?.message} {...form.register('ensName')} />

          <Controller
            control={form.control}
            name="networks"
            render={({ field }) => (
              <fieldset aria-describedby={errors.networks ? networksErrorId : undefined} className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Redes</legend>
                <div className="flex gap-4">
                  {(Object.entries(PAYMENT_NETWORKS) as Array<[PaymentNetwork, string]>).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value.includes(value)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked ? [...field.value, value] : field.value.filter((n) => n !== value),
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {errors.networks && (
                  <p id={networksErrorId} className="text-xs text-coral">
                    {errors.networks.message}
                  </p>
                )}
              </fieldset>
            )}
          />

          {!wallet?.isDefault && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={isFirst && !editing} className="size-4 accent-primary" {...form.register('isDefault')} />
              Definir como carteira principal
            </label>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="wallet-form" disabled={pending} className="font-bold">
            {pending ? 'Salvando…' : 'Salvar carteira'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
