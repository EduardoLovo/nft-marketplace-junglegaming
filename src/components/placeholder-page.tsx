import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** Página provisória para rotas cujos fluxos ainda serão implementados. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="flex min-h-[50vh] flex-col items-start justify-center gap-6 py-12">
      <h1 className="text-3xl font-bold uppercase">{title}</h1>
      <p className="text-sm leading-6 text-text-secondary">Esta página está em construção.</p>
      <Button asChild size="lg" className="h-10 px-8 font-bold uppercase">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
