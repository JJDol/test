import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, stageIndex) => (
          <div key={stageIndex} className="bg-gray-100 rounded-lg p-4 flex flex-col w-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="h-[900px] space-y-3 overflow-y-auto w-full">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="bg-white p-4 rounded-md shadow w-full">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
