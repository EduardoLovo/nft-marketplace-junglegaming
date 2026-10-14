import { Skeleton } from '@/components/ui/skeleton'

/** Mesmo esqueleto da página de detalhe, para não haver salto quando os dados chegam. */
export function NftDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" className="flex flex-col gap-3 pt-2 lg:pt-8">
      <Skeleton className="h-4 w-36" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex w-full flex-col-reverse gap-4 lg:w-[573px] lg:flex-row lg:items-center lg:gap-7">
          <div className="flex gap-3 lg:flex-col lg:gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-16 rounded-lg lg:size-[100px]" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full lg:size-[444px]" />
        </div>
        <div className="flex flex-1 flex-col gap-5">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-20 w-64" />
        </div>
      </div>
    </div>
  )
}
