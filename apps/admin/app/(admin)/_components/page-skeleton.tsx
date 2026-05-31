/**
 * Generic loading skeleton shown over the page-content area during a
 * cross-page navigation (clicking a sidebar menu item). Because the
 * destination's exact shape is unknown at click time, this mimics the
 * common layout shared by almost every admin page: a PageHeader
 * (icon + title + description), a filter toolbar, and a table card.
 *
 * Per-page navigations that DO know their shape (e.g. changing ชั้น on
 * the teaching / students / subjects pages) use their own tailored
 * skeletons instead — this one is only the fallback for menu clicks.
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      {/* PageHeader mimic — icon box + title + description */}
      <div className="mb-6 flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-lg bg-zinc-200" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 w-48 rounded bg-zinc-200" />
          <div className="h-3.5 w-72 max-w-full rounded bg-zinc-100" />
        </div>
      </div>

      {/* Toolbar mimic — a couple of dropdowns / action buttons */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="h-9 w-44 rounded-md bg-zinc-200" />
        <div className="h-9 w-32 rounded-md bg-zinc-100" />
      </div>

      {/* Table card mimic — header strip + rows */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="h-4 w-1/3 rounded bg-zinc-200" />
        </div>
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-4 w-8 shrink-0 rounded bg-zinc-100" />
              <div className="h-4 flex-1 rounded bg-zinc-100" />
              <div className="hidden h-4 w-28 rounded bg-zinc-100 sm:block" />
              <div className="h-4 w-16 shrink-0 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
