import type { NftReview } from '@/contracts/catalog'
import type { NftRecord } from './nfts'

const AUTHORS = ['Marina Lopes', 'Rafael Ito', 'Bia Torres', 'Caio Nunes', 'Lara Sato', 'Davi Rocha', 'Nina Prado', 'Hugo Lima']
const COMMENTS = [
  'Arte impecável em alta resolução. A procedência na rede me deu muita confiança.',
  'Chegou na carteira em segundos. A edição limitada valeu cada ETH.',
  'Os detalhes do figurino são incríveis de perto. Recomendo a coleção inteira.',
  'Bom acesso aos lançamentos exclusivos para quem coleciona.',
  'A comunidade da coleção é muito ativa e o criador responde rápido.',
  'Preço justo pela raridade. Só queria que tivesse mais atributos animados.',
]

/** Hash simples e estável do id, para cada NFT ter avaliações próprias e fixas. */
function hash(value: string) {
  let h = 0
  for (const char of value) h = (Math.imul(31, h) + char.charCodeAt(0)) | 0
  return Math.abs(h)
}

/**
 * Gera as avaliações a partir do próprio NFT: a quantidade é a de `rating.count`
 * e a média fica o mais próxima possível de `rating.average`, para a aba e o
 * resumo do detalhe não se contradizerem.
 */
export function reviewsFor(nft: NftRecord): NftReview[] {
  const seed = hash(nft.id)
  const { count, average } = nft.rating
  const total = Math.round(average * count)
  return Array.from({ length: count }, (_, index) => {
    // Distribui a soma arredondada das notas entre as avaliações.
    const base = Math.floor(total / count)
    const rating = Math.min(5, base + (index < total % count ? 1 : 0))
    return {
      id: `${nft.id}--review-${index + 1}`,
      author: AUTHORS[(seed + index) % AUTHORS.length],
      rating,
      comment: COMMENTS[(seed + index * 7) % COMMENTS.length],
      createdAt: new Date(Date.parse(nft.listedAt) + (index + 1) * 86_400_000).toISOString(),
    }
  })
}
