import { useId } from 'react'
import type { EditionKind, NftEdition } from '@/contracts/catalog'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { isEditionAvailable } from '../editions'

/**
 * Radios nativos estilizados como pílulas: setas do teclado, foco e estado
 * desabilitado vêm do navegador, sem reimplementar o padrão radiogroup.
 */
export function EditionPicker({
  editions,
  selected,
  onSelect,
}: {
  editions: NftEdition[]
  selected: EditionKind
  onSelect: (kind: EditionKind) => void
}) {
  const name = useId()

  return (
    <fieldset className="flex flex-col">
      <legend className="mb-3 text-[15px] leading-4 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-1.5">
        {editions.map((edition) => {
          const available = isEditionAvailable(edition)
          return (
            <label key={edition.id} title={available ? formatEth(edition.priceEth) : 'Esgotada'}>
              <input
                type="radio"
                name={name}
                value={edition.kind}
                checked={edition.kind === selected}
                disabled={!available}
                onChange={() => onSelect(edition.kind)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex h-7 min-w-9 cursor-pointer items-center justify-center rounded-full border border-border px-2 text-sm leading-4 text-text-secondary uppercase transition-colors hover:border-primary/60',
                  'peer-checked:border-primary peer-checked:font-medium peer-checked:text-primary',
                  'peer-focus-visible:ring-3 peer-focus-visible:ring-ring/60',
                  // Esgotada: riscada e esmaecida, sem depender só da cor.
                  'peer-disabled:cursor-not-allowed peer-disabled:line-through peer-disabled:opacity-50 peer-disabled:hover:border-border',
                )}
              >
                {edition.label}
                <span className="sr-only">{available ? ` (${formatEth(edition.priceEth)})` : ' (esgotada)'}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
