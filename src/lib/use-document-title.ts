import { useEffect } from 'react'

const DEFAULT_TITLE = 'Kurio | Marketplace de NFTs'

/** Título da aba enquanto a página está montada; ao sair, volta ao padrão. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | Kurio` : DEFAULT_TITLE
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title])
}
