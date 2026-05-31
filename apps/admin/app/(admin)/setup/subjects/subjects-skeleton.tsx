/**
 * Skeleton for the subjects table — shown by `<NavigationGate>` the
 * instant the admin picks a different ชั้น / ห้อง / แผน, before the new
 * plan's subjects are fetched. Mirrors the real table's columns
 * (ที่ / รหัส / ชื่อรายวิชา / ชั่วโมง·หน่วยกิต / ประเภท / จัดการ) with the
 * same mobile-stacked layout so nothing jumps when real rows swap in.
 */
export function SubjectsSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-zinc-200 bg-white text-left text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          <th className="px-2 py-2.5 text-center font-medium sm:px-4">ที่</th>
          <th className="px-2 py-2.5 font-medium sm:px-4 md:hidden">
            รหัส / ชื่อรายวิชา
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">รหัส</th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            ชื่อรายวิชา
          </th>
          <th className="px-2 py-2.5 text-center font-medium sm:px-4 md:hidden" />
          <th className="hidden px-4 py-2.5 text-center font-medium md:table-cell" />
          <th className="hidden px-4 py-2.5 font-medium md:table-cell" />
          <th className="px-2 py-2.5 text-right font-medium sm:px-4">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200">
        {Array.from({ length: rowCount }).map((_, i) => (
          <tr key={i}>
            {/* ที่ */}
            <td className="px-2 py-3 text-center sm:px-4">
              <div className="mx-auto h-4 w-5 animate-pulse rounded bg-zinc-100" />
            </td>
            {/* Mobile combined code+name */}
            <td className="px-2 py-3 sm:px-4 md:hidden">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-100" />
              <div className="mt-1 h-4 w-32 max-w-full animate-pulse rounded bg-zinc-100" />
            </td>
            {/* Desktop code */}
            <td className="hidden px-4 py-3 md:table-cell">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
            </td>
            {/* Desktop name */}
            <td className="hidden px-4 py-3 md:table-cell">
              <div className="h-4 w-44 max-w-full animate-pulse rounded bg-zinc-100" />
            </td>
            {/* Mobile combined hours+category */}
            <td className="px-2 py-3 text-center sm:px-4 md:hidden">
              <div className="mx-auto h-4 w-12 animate-pulse rounded bg-zinc-100" />
              <div className="mx-auto mt-1 h-5 w-14 animate-pulse rounded-full bg-zinc-100" />
            </td>
            {/* Desktop hours */}
            <td className="hidden px-4 py-3 text-center md:table-cell">
              <div className="mx-auto h-4 w-10 animate-pulse rounded bg-zinc-100" />
            </td>
            {/* Desktop category */}
            <td className="hidden px-4 py-3 md:table-cell">
              <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
            </td>
            {/* จัดการ */}
            <td className="px-2 py-3 text-right sm:px-4">
              <div className="ml-auto flex w-fit gap-1">
                <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-100" />
                <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-100" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
