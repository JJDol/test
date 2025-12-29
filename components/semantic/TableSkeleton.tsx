export default function TableSkeleton() {
    const skeletonCards = Array.from({ length: 3 }, (_, idx) => (
        <div 
            key={idx} 
            className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-lg space-y-4"
        >
            <div className="h-6 w-3/4 bg-gray-200 rounded" />
            <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-4 w-4/6 bg-gray-200 rounded" />
            </div>
        </div>
    ));

    return (
        <div className="flex flex-row gap-8 w-full">
            <div className="w-1/2 space-y-6">
                <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="rounded-lg shadow-xl p-6 bg-white border border-gray-200 space-y-4 animate-pulse">
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-5/6 bg-gray-200 rounded" />
                    <div className="h-4 w-4/6 bg-gray-200 rounded" />
                </div>
            </div>
            <div className="w-1/2 space-y-6">
                {skeletonCards}
            </div>
        </div>
    );
}