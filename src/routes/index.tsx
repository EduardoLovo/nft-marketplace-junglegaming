import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Conteúdo provisório até a implementação da home do Figma.
function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-8 px-6">
      <p className="text-sm font-medium uppercase text-foreground">Bem-vindo à Kurio</p>
      <h1 className="text-4xl font-bold uppercase leading-tight md:text-[2.6875rem] md:leading-[4.375rem]">
        Seja dono do futuro
        <br />
        da arte digital
      </h1>
      <p className="max-w-xl text-sm leading-6 text-text-secondary">
        Descubra NFTs selecionados de criadores emergentes e consagrados.
      </p>
      <div>
        <Button size="lg" className="h-10 px-8 font-bold uppercase">
          Explorar
        </Button>
      </div>
    </main>
  )
}
