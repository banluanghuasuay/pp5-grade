"use client";

import { Loader2, Printer } from "lucide-react";
import { useState } from "react";

type Props = {
  /** The report URL to load + print. Same-origin (the admin app). */
  url: string;
  /** Tooltip text for the button. */
  title?: string;
};

/**
 * Renders a button that loads `url` inside a hidden iframe, then triggers
 * the browser's print dialog on that iframe — skipping the preview page.
 *
 * The iframe inherits cookies (same origin), so authenticated routes work.
 * The report page's own globals.css `.no-print` rules + `@page` declarations
 * apply inside the iframe context.
 */
export function DirectPrintButton({ url, title }: Props) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "-9999px";
    iframe.style.bottom = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.src = url;

    // Removes the hidden iframe from the DOM. Kept separate from the overlay
    // dismissal so the spinner can close the instant the print dialog opens,
    // while the iframe lingers long enough for the browser to finish printing.
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      // Save-as-PDF takes its filename from the TOP document's title, not the
      // iframe's. Borrow the report's own <title> (set per-report via
      // generateMetadata, e.g. "ปพ.5 รวมชั้น ภาคเรียนที่ 1 ปีการศึกษา 2569")
      // for the duration of the print, then restore. Without this every PDF
      // is named after the admin page's constant title.
      const originalTitle = document.title;
      const reportTitle = iframe.contentDocument?.title;
      try {
        if (reportTitle) document.title = reportTitle;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        // Fallback: navigate the parent if print fails for any reason.
        console.error("Print failed; opening report in a new tab.", err);
        window.open(url, "_blank", "noopener");
      } finally {
        // The print dialog is now open (it blocks until dismissed). Drop the
        // overlay so it isn't stuck behind the dialog.
        setPrinting(false);
        // Restore the title after the dialog has captured it, then remove
        // the iframe.
        setTimeout(() => {
          document.title = originalTitle;
        }, 1000);
        setTimeout(cleanup, 1500);
      }
    };

    // Some browsers fire onload before fonts/layout settle — defer a bit.
    iframe.onload = () => setTimeout(triggerPrint, 300);
    // Safety net: 8s timeout in case onload never fires
    setTimeout(triggerPrint, 8000);

    document.body.appendChild(iframe);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        disabled={printing}
        title={title}
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        {printing ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Printer className="size-3.5" aria-hidden />
        )}
        {printing ? "กำลังเตรียม..." : "พิมพ์รายงาน"}
      </button>

      {/* Full-screen feedback while the hidden iframe loads (~1-2s) so users
          don't think the click did nothing and wander off. `no-print` keeps
          it out of the printed output. Dismissed once triggerPrint runs. */}
      {printing ? (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-5 shadow-xl">
            <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden />
            <span className="text-sm font-medium text-zinc-700">
              กำลังเตรียมรายงาน…
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
