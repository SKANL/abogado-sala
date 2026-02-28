import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function ClientesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <TableSkeleton columns={4} rows={8} />
          </div>
          {/* Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
