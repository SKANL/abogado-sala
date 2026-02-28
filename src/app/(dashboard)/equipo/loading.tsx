import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function EquipoLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      {/* Active members skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <TableSkeleton columns={3} rows={4} />
          </div>
          <div className="md:hidden grid grid-cols-1 gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
