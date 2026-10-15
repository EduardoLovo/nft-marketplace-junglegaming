import { useId } from 'react'
import type { EditionKind, NftEdition } from '@/contracts/catalog'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { isEditionAvailable } from '../editions'

/** Largura de cada elipse no Figma (todas com 28px de altura). */
const ELLIPSE_WIDTH: Record<EditionKind, string> = {
  unique: 'w-9',
  'limited-10': 'w-[42px]',
  'limited-50': 'w-[46px]',
  open: 'w-[66px]',
}

/**
 * Radios nativos estilizados como as elipses do Figma: setas do teclado, foco e estado
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
      <legend className="mb-2 text-[15px] leading-4 font-bold lg:mb-3">Edição:</legend>
      <div className="flex flex-wrap gap-3 lg:gap-1.5">
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
                  'flex h-7 cursor-pointer items-center justify-center rounded-[50%] border border-border text-sm leading-4 text-text-secondary uppercase transition-colors hover:border-primary/60',
                  ELLIPSE_WIDTH[edition.kind],
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
