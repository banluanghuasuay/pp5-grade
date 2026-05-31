/**
 * Skeleton for the teachers table — shown by `<FilterNavGate>` the
 * instant a ตำแหน่ง/กลุ่มสาระ/สถานะ filter changes. Mirrors the real
 * table: `table-fixed`, mobile shows ชื่อ(+ตำแหน่ง) / กลุ่มสาระ / จัดการ,
 * desktop adds ชื่อผู้ใช้ + ตำแหน่ง + สถานะ columns.
 */
export function TeachersSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-3 py-3 sm:px-4">
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="hidden px-4 py-3 md:table-cell">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="hidden px-4 py-3 md:table-cell">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="w-28 px-2 py-3 sm:w-36 sm:px-4">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="hidden w-24 px-4 py-3 md:table-cell">
              <div className="h-3 w-12 animate-pulse rounded bg-zinc-200" />
            </th>
            <th className="w-24 px-2 py-3 sm:w-28 sm:px-4">
              <div className="ml-auto h-3 w-12 animate-pulse rounded bg-zinc-200" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-3 sm:px-4">
                <div className="h-4 w-32 max-w-full animate-pulse rounded bg-zinc-100" />
                {/* mobile-only ตำแหน่ง line under the name */}
                <div className="mt-1 h-3 w-20 animate-pulse rounded bg-zinc-100 md:hidden" />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="px-2 py-3 sm:px-4">
                <div className="h-4 w-full max-w-[8rem] animate-pulse rounded bg-zinc-100" />
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100" />
              </td>
              <td className="px-2 py-3 sm:px-4">
                <div className="ml-auto h-8 w-8 animate-pulse rounded-md bg-zinc-100" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
