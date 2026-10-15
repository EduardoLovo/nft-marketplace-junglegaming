import { createFileRoute } from '@tanstack/react-router'
import { catalogQueryOptions } from '@/features/catalog/api'
import { CatalogSection, MobileCatalogBar } from '@/features/catalog/components/catalog-section'
import { catalogSearchSchema, toCatalogQuery } from '@/features/catalog/search'
import { Hero } from '@/features/home/components/hero'
import { Journal } from '@/features/home/components/journal'
import { Promos } from '@/features/home/components/promos'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toCatalogQuery(search),
  // Dispara a busca do catálogo junto com a navegação, sem bloquear o render:
  // a página aparece na hora com skeletons e os dados entram ao chegar.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(catalogQueryOptions(deps))
  },
  component: HomePage,
})

function HomePage() {
  return (
    // Mobile segue a ordem do Figma: busca, hero, abas e grade, com 16px entre eles.
    <div className="flex flex-col gap-4 lg:gap-24 lg:pt-8">
      <MobileCatalogBar />
      <Hero />
      <CatalogSection />
      <Promos />
      <Journal />
    </div>
  )
}
