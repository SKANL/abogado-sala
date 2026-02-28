import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function BillingLoading() {
  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeaderSkeleton withButton={false} />

      {/* Subscription status card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      <Separator />

      {/* Pricing plans skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
