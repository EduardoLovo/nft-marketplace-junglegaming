/** Nota no formato brasileiro, com no máximo uma casa decimal ("4,5"). */
export const formatRating = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
