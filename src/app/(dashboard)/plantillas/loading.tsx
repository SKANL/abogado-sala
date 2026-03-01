import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function PlantillasLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <TableSkeleton columns={4} rows={5} />
          </div>
          {/* Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
