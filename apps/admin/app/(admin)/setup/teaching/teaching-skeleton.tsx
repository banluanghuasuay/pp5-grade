import { Card } from "@pp5/ui";

/**
 * Skeleton placeholder shown while a NEW classroom's teaching data is
 * being fetched (after admin picks a different ชั้น/ห้อง in the
 * selector). Mimics the real table shape — header strip + N rows with
 * placeholder boxes for each column — so the layout doesn't jump.
 *
 * Mounted by both the parent `<NavigationGate>` (URL change → instant
 * skeleton) and the inner `<Suspense>` fallback (RSC still streaming).
 */
export function TeachingSkeleton({ rowCount = 11 }: { rowCount?: number }) {
  return (
    <Card padding={false} className="overflow-hidden">
      {/* Header strip */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 sm:w-1/3" />
      </div>

      {/* Column headers */}
      <div className="hidden border-b border-zinc-200 px-4 py-2.5 md:flex md:gap-4">
        <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 flex-1 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-48 animate-pulse rounded bg-zinc-200" />
      </div>

      {/* Rows — N placeholder rows with shimmer */}
      <div className="divide-y divide-zinc-200">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4"
          >
            {/* Code */}
            <div className="hidden h-4 w-16 animate-pulse rounded bg-zinc-100 md:block" />
            {/* Subject (mobile = combined: name big + meta small below) */}
            <div className="flex-1 space-y-1.5 md:space-y-0">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 md:w-2/3" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100 md:hidden" />
            </div>
            {/* Category */}
            <div className="hidden h-5 w-16 animate-pulse rounded-full bg-zinc-100 md:block" />
            {/* Teacher dropdown */}
            <div className="h-9 w-full animate-pulse rounded bg-zinc-100 md:w-48" />
          </div>
        ))}
      </div>
    </Card>
  );
}
