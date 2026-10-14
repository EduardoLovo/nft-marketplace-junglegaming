import { createFileRoute } from '@tanstack/react-router'
import { catalogQueryOptions } from '@/features/catalog/api'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
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
    <div className="flex flex-col gap-8 pt-2 lg:gap-24 lg:pt-8">
      <Hero />
      <CatalogSection />
      <Promos />
      <Journal />
    </div>
  )
}
