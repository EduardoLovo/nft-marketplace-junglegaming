import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * Link "Entrar": abre o modal de login sobre a página atual, mantendo rota,
 * filtros e rolagem. Continua sendo um link (abre em nova aba, se quiserem).
 */
export function LoginLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link to="." search={(prev) => ({ ...prev, auth: 'login' as const })} resetScroll={false} className={className}>
      {children}
    </Link>
  )
}
