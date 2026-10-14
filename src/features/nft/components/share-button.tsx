import { Share2Icon } from 'lucide-react'
import { toast } from 'sonner'

/** Usa o compartilhamento nativo quando existe (mobile); senão, copia o link. */
export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado', { description: 'O endereço deste NFT está na área de transferência.' })
    } catch (error) {
      // Cancelar o menu nativo não é erro para o usuário.
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Não foi possível compartilhar', { description: 'Copie o endereço pela barra do navegador.' })
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Compartilhar ${title}`}
      className="rounded-sm text-text-secondary hover:text-primary"
    >
      <Share2Icon className="size-[18px]" aria-hidden="true" />
    </button>
  )
}
