/**
 * Skeleton for the students table — shown by `<NavigationGate>` the
 * instant the admin picks a different ชั้น / ห้อง, before the new
 * roster has been fetched. Mirrors the real table: `table-fixed` + the
 * same per-column widths so it fits the mobile viewport without
 * horizontal scroll and doesn't jump when real data swaps in.
 *
 * The "ห้อง" column is hidden on mobile to match the real table
 * (`hidden md:table-cell`).
 */
export function StudentsSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="hidden w-16 px-3 py-2 md:table-cell">
              <div className="h-3 w-8 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="w-14 px-2 py-2 sm:px-3">
              <div className="h-3 w-8 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="w-16 px-2 py-2 sm:w-24 sm:px-3">
              <div className="h-3 w-10 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="px-2 py-2 sm:px-3">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="w-20 px-2 py-2 sm:px-3">
              <div className="ml-auto h-3 w-12 animate-pulse rounded bg-zinc-200" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i}>
              <td className="hidden px-3 py-2.5 md:table-cell">
                <div className="h-4 w-10 animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="px-2 py-2.5 sm:px-3">
                <div className="h-4 w-6 animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="px-2 py-2.5 sm:px-3">
                <div className="h-4 w-full max-w-[5rem] animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="px-2 py-2.5 sm:px-3">
                <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="px-2 py-2.5 sm:px-3">
                <div className="ml-auto flex w-fit gap-1">
                  <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-100" />
                  <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-100" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
