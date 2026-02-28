import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  hasHeader?: boolean;
}

/**
 * Generic table skeleton for loading states.
 * Matches the column/row density of the real table.
 */
export function TableSkeleton({
  columns = 4,
  rows = 6,
  hasHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="space-y-1">
      {hasHeader && (
        <div className="flex gap-4 px-4 py-3 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4 flex-1"
              style={{ opacity: 1 - j * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Page header skeleton (title + optional action button).
 */
export function PageHeaderSkeleton({ withButton = true }: { withButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>
      {withButton && <Skeleton className="h-9 w-32 rounded-md" />}
    </div>
  );
}

/**
 * KPI card grid skeleton for dashboard.
 */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
