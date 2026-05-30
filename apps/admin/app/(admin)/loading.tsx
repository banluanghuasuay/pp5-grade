import { Loader2 } from "lucide-react";

/**
 * Shown during navigation/data-fetch for any page inside the (admin) route group.
 * Sidebar stays visible because this only replaces the <main> children.
 */
export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-sm">กำลังโหลด...</p>
      </div>
    </div>
  );
}
