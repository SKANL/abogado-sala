import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function CasosLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <TableSkeleton columns={5} rows={8} />
          </div>
          {/* Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
