"use client";

import { Printer } from "lucide-react";

/** Triggers the browser's native print dialog (Ctrl+P programmatically). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <Printer className="size-4" aria-hidden />
      พิมพ์
    </button>
  );
}
