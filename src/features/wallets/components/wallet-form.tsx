import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { ENS_PATTERN, type User } from '@/contracts/auth'
import {
  WALLET_ADDRESS_PATTERN,
  WALLET_PROVIDERS,
  type PaymentNetwork,
  type Wallet,
  type WalletProvider,
} from '@/contracts/wallets'
import { SelectField } from '@/features/checkout/components/select-field'
import { isApiError } from '@/lib/api/errors'
import { applyApiFieldErrors } from '@/lib/form'
import { useCreateWallet, useUpdateWallet } from '../api'

/** "Rede" do Figma é um select único; carteiras EVM podem operar nas duas redes. */
const NETWORK_CHOICES = {
  ethereum: { label: 'Ethereum', networks: ['ethereum'] },
  polygon: { label: 'Polygon', networks: ['polygon'] },
  both: { label: 'Ethereum e Polygon', networks: ['ethereum', 'polygon'] },
} satisfies Record<string, { label: string; networks: PaymentNetwork[] }>
type NetworkChoice = keyof typeof NETWORK_CHOICES

const toChoice = (networks: PaymentNetwork[]): NetworkChoice =>
  networks.length > 1 ? 'both' : (networks[0] ?? 'ethereum')

/** Na edição o tipo fica travado (o select desabilitado não envia valor), então só é exigido no cadastro. */
const walletSchema = (editing: boolean) => z.object({
  label: z.string().trim().min(2, 'Use de 2 a 24 caracteres.').max(24, 'Use de 2 a 24 caracteres.'),
  network: z.enum(Object.keys(NETWORK_CHOICES) as [NetworkChoice, ...NetworkChoice[]], { message: 'Selecione uma rede.' }),
  address: z.string().trim().regex(WALLET_ADDRESS_PATTERN, 'Informe um endereço 0x com 40 caracteres hexadecimais.'),
  ensName: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || ENS_PATTERN.test(value), 'Use um nome ENS válido, terminado em .eth.'),
  provider: editing
    ? z.string().optional()
    : z.enum(Object.keys(WALLET_PROVIDERS) as [WalletProvider, ...WalletProvider[]], { message: 'Selecione o tipo de carteira.' }),
})

type WalletValues = z.infer<ReturnType<typeof walletSchema>>

const PROVIDER_OPTIONS = (Object.entries(WALLET_PROVIDERS) as Array<[WalletProvider, string]>).map(([value, label]) => ({ value, label }))
const NETWORK_OPTIONS = (Object.entries(NETWORK_CHOICES) as Array<[NetworkChoice, { label: string }]>).map(([value, { label }]) => ({
  value,
  label,
}))

/** No Figma o campo começa a 25px do topo, 4px dentro da faixa de 29px do rótulo. */
const FIELD = '[&>div]:-mt-1'

/** Campo do perfil exibido no formulário da carteira, como no Figma, só para leitura. */
function ProfileReadOnly({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  return <TextField variant="checkout" label={label} required readOnly tabIndex={-1} value={value} placeholder={placeholder} className={`opacity-80 ${FIELD}`} />
}

/**
 * Formulário de carteira do Figma ("Wallets Form"): duas colunas de 417px. Os
 * campos do perfil aparecem só para leitura (editados em "Dados do perfil").
 * Sem `wallet`, cadastra uma nova; endereço e tipo não mudam depois do cadastro.
 */
export function WalletForm({
  wallet,
  user,
  makeDefault,
  onDone,
  onCancel,
}: {
  wallet?: Wallet
  user: User
  /** Ao cadastrar: se a nova carteira vira a principal. */
  makeDefault: boolean
  onDone?: () => void
  onCancel?: () => void
}) {
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const editing = Boolean(wallet)
  const form = useForm<WalletValues>({
    resolver: zodResolver(walletSchema(editing)),
    values: {
      label: wallet?.label ?? '',
      network: wallet ? toChoice(wallet.networks) : ('' as NetworkChoice),
      address: wallet?.address ?? '',
      ensName: wallet?.ensName ?? '',
      provider: wallet?.provider ?? ('' as WalletProvider),
    },
    resetOptions: { keepDirtyValues: true },
  })
  const { errors } = form.formState
  const pending = create.isPending || update.isPending

  const onSubmit = form.handleSubmit(async (values) => {
    const networks = NETWORK_CHOICES[values.network].networks
    const ensName = values.ensName || null
    try {
      if (wallet) {
        await update.mutateAsync({ id: wallet.id, input: { label: values.label, networks, ensName } })
        toast.success('Carteira atualizada')
      } else {
        await create.mutateAsync({ label: values.label, provider: values.provider as WalletProvider, address: values.address, ensName, networks, isDefault: makeDefault })
        toast.success('Carteira adicionada')
      }
      onDone?.()
    } catch (error) {
      if (!applyApiFieldErrors(form, error, ['label', 'address', 'ensName', 'provider'])) {
        toast.error('Não foi possível salvar a carteira', { description: isApiError(error) ? error.message : undefined })
      }
    }
  })

  const ensLocal = user.ensName?.replace(/\.eth$/, '') ?? ''
  return (
    <form onSubmit={onSubmit} noValidate aria-label={editing ? `Editar ${wallet?.label}` : 'Adicionar carteira'} className="flex flex-col gap-8">
      <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
        <ProfileReadOnly label="Nome de exibição" value={user.name} />
        <TextField variant="checkout" className={FIELD} label="Apelido da carteira" required error={errors.label?.message} {...form.register('label')} />

        <SelectField className={FIELD} label="Rede" required placeholder="Selecione uma rede" options={NETWORK_OPTIONS} error={errors.network?.message} {...form.register('network')} />
        <ProfileReadOnly label="Nome do perfil" value={user.name} />

        <TextField
          variant="checkout"
          className={FIELD}
          label="Endereço da carteira"
          required
          readOnly={editing}
          placeholder="Endereço 0x da carteira"
          autoComplete="off"
          spellCheck={false}
          error={errors.address?.message}
          {...form.register('address')}
        />
        {/* Sem rótulo visível no Figma: só o placeholder, alinhado à base da linha. */}
        <TextField
          variant="checkout"
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          placeholder="ENS ou carteira secundária (opcional)"
          className="sm:pt-[25px]"
          error={errors.ensName?.message}
          {...form.register('ensName')}
        />

        <SelectField
          className={FIELD}
          label="Tipo de carteira"
          required
          disabled={editing}
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          error={errors.provider?.message}
          {...form.register('provider')}
        />
        <ProfileReadOnly label="Código de indicação" value="" placeholder="Informado no pagamento" />

        <ProfileReadOnly label="E-mail" value={user.email} />
        {/* "Nome ENS" do perfil: domínio (78px) + nome (329px). */}
        <div className="flex flex-col">
          <p className="flex h-[29px] items-center gap-1 text-[15px] leading-[15px]">
            Nome ENS
            <span aria-hidden="true" className="text-[22px] leading-none text-coral">
              *
            </span>
          </p>
          <div className="-mt-1 flex gap-2.5 opacity-80">
            <span className="flex h-10 w-[78px] shrink-0 items-center rounded-[3px] border border-border pl-2.5 text-[15px] leading-[15px]">.eth</span>
            <span className="flex h-10 min-w-0 flex-1 items-center truncate rounded-[3px] border border-border px-[13px] text-sm">{ensLocal}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Button type="submit" disabled={pending} className="h-10 w-[131px] rounded-[3px] px-0 text-sm leading-4 font-bold">
          {pending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-sm text-sm hover:text-kurio-accent">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
