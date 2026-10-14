import { toast } from 'sonner'

/**
 * Feedback para ações fora do escopo da demonstração (páginas editoriais,
 * suporte, newsletter etc.). O desafio exige que essas ações não pareçam
 * ter funcionado, então o retorno é sempre explícito.
 */
export function notAvailable(feature: string) {
  toast.info('Indisponível nesta demonstração', {
    id: 'not-available',
    description: `${feature} não faz parte do escopo deste projeto.`,
  })
}
