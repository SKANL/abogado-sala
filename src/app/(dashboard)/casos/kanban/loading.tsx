import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeaderSkeleton } from "@/components/ui/skeletons";

function KanbanColumnSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      {/* Cards */}
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} className="bg-card">
          <CardHeader className="p-3 pb-2 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Skeleton className="h-5 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CasesKanbanLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumnSkeleton cards={4} />
        <KanbanColumnSkeleton cards={3} />
        <KanbanColumnSkeleton cards={2} />
        <KanbanColumnSkeleton cards={1} />
      </div>
    </div>
  );
}
