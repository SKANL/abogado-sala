import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TemplatBuilderLoading() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-5rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Two-panel editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Fields panel */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex-1 space-y-3 overflow-y-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>

        {/* Preview panel */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
