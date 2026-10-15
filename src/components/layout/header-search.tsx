import { useNavigate } from '@tanstack/react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import { HeaderSearchIcon } from './header-icons'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Busca do header desktop. O ícone expande um campo; ao enviar, leva para o
 * catálogo da home com o termo na URL (o estado do catálogo vive na URL).
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const navigate = useNavigate()

  function close() {
    setOpen(false)
    setTerm('')
    // Devolve o foco ao botão que abriu o campo.
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = term.trim()
    navigate({ to: '/', search: q ? { q } : {}, hash: 'mercado' })
    close()
  }

  if (!open) {
    return (
      // Ícone de 20px do Figma; o padding negativo amplia a área de clique sem mudar o layout.
      <button
        ref={triggerRef}
        type="button"
        aria-label="Buscar NFTs"
        onClick={() => setOpen(true)}
        className="-m-2 rounded-sm p-2 text-foreground hover:text-kurio-accent"
      >
        <HeaderSearchIcon className="size-5" />
      </button>
    )
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-1">
      <label htmlFor={inputId} className="sr-only">
        Buscar NFTs, coleções ou criadores
      </label>
      <Input
        id={inputId}
        autoFocus
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && close()}
        placeholder="Buscar NFTs..."
        className="h-9 w-56 bg-surface-card"
      />
      <Button type="submit" variant="ghost" size="icon" aria-label="Buscar">
        <SearchIcon className="size-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Fechar busca" onClick={close}>
        <XIcon className="size-5" />
      </Button>
    </form>
  )
}
