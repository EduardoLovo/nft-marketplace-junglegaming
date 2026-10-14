import { cn } from "cn"

/**
 * Placeholder com efeito shimmer. Fica oculto para leitores de tela; quem
 * usa deve anunciar o carregamento (ex.: `aria-busy` no container).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md bg-surface-raised", className)}
      {...props}
    />
  )
}

export { Skeleton }
