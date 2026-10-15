/**
 * Substitui o pacote `tldts` no bundle (alias no vite.config.ts).
 *
 * O MSW usa o `tough-cookie` para guardar cookies das respostas simuladas, e o
 * `tough-cookie` só chama `getDomain` do `tldts`, que embute a lista completa
 * de sufixos públicos (~185 KB). A API simulada da Kurio não usa cookies (a
 * sessão vai no cabeçalho Authorization), então basta o domínio registrável
 * aproximado: os dois últimos rótulos, ou o próprio host (ex.: localhost).
 */
export function getDomain(hostname: string | null | undefined): string | null {
  if (!hostname) return null
  const labels = hostname.toLowerCase().replace(/\.$/, '').split('.')
  return labels.length <= 2 ? labels.join('.') : labels.slice(-2).join('.')
}
