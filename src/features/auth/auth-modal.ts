import { useNavigate, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

export type AuthMode = 'login' | 'signup'

/**
 * Só caminhos internos: um link malicioso não pode usar o login como
 * redirecionador para outro site.
 */
const internalPath = z
  .unknown()
  .transform((value) =>
    typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined,
  )
  .optional()

/**
 * Estado do modal de login/cadastro na URL, válido em qualquer rota:
 * `?auth=login` abre o modal sobre a página atual. `next` é o destino depois
 * de entrar (ex.: uma rota protegida) e `reason=expired` mostra o aviso de
 * sessão expirada.
 */
export const authModalSearchSchema = z.object({
  auth: z.enum(['login', 'signup']).optional().catch(undefined),
  next: internalPath,
  reason: z.enum(['expired']).optional().catch(undefined),
})

export type AuthModalSearch = z.infer<typeof authModalSearchSchema>

/** Monta o endereço de `baseHref` com o modal de autenticação aberto. */
export function authHref(baseHref: string, params: { auth: AuthMode; next?: string; reason?: 'expired' }) {
  const url = new URL(baseHref, 'http://kurio.local')
  url.searchParams.set('auth', params.auth)
  if (params.next) url.searchParams.set('next', params.next)
  else url.searchParams.delete('next')
  if (params.reason) url.searchParams.set('reason', params.reason)
  else url.searchParams.delete('reason')
  return `${url.pathname}${url.search}${url.hash}`
}

/** Remove os parâmetros do modal de um endereço. */
export function withoutAuth(href: string) {
  const url = new URL(href, 'http://kurio.local')
  for (const key of ['auth', 'next', 'reason']) url.searchParams.delete(key)
  return `${url.pathname}${url.search}${url.hash}`
}

/** Abre, alterna e fecha o modal de autenticação sobre a página atual. */
export function useAuthModal() {
  const router = useRouter()
  const navigate = useNavigate()
  const currentHref = () => router.state.location.href

  return {
    open(mode: AuthMode, options: { next?: string } = {}) {
      void navigate({ href: authHref(currentHref(), { auth: mode, next: options.next }), resetScroll: false })
    },
    /** Alterna entre "Entrar" e "Criar conta" sem empilhar histórico. */
    switchTo(mode: AuthMode) {
      const url = new URL(currentHref(), 'http://kurio.local')
      url.searchParams.set('auth', mode)
      void navigate({ href: `${url.pathname}${url.search}${url.hash}`, replace: true, resetScroll: false })
    },
    close() {
      void navigate({ href: withoutAuth(currentHref()), replace: true, resetScroll: false })
    },
  }
}
