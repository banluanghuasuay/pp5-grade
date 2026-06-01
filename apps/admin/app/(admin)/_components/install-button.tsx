"use client";

import { cn } from "@pp5/ui";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * The `beforeinstallprompt` event isn't in TS's DOM lib yet — declare the
 * shape we use (Chrome/Edge/Android).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "ติดตั้งแอป" button — installs the PWA (Add to Home Screen / Install app).
 *
 * It only appears when the browser fires `beforeinstallprompt` (the app meets
 * PWA install criteria and isn't installed yet). That means it self-hides when:
 *   - the app is already installed (running in standalone display mode), or
 *   - the browser doesn't support it (e.g. iOS Safari — users there use the
 *     Share → "Add to Home Screen" flow manually).
 */
export function InstallButton({ collapsed }: { collapsed: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    // Already running as an installed app → never offer to install.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress Chrome's default mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // Whether accepted or dismissed, the prompt can't be reused — drop it.
    // (Chrome will fire beforeinstallprompt again later if still eligible.)
    if (outcome === "accepted") setDeferred(null);
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      title={collapsed ? "ติดตั้งแอป" : undefined}
      aria-label={collapsed ? "ติดตั้งแอป" : undefined}
      className={cn(
        "mb-2 flex items-center gap-2 rounded-md border border-primary-600 bg-primary-50 text-sm font-medium text-primary-700 shadow-sm transition-colors hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1",
        collapsed
          ? "h-9 w-full justify-center"
          : "w-full justify-center px-3 py-1.5",
      )}
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {!collapsed && "ติดตั้งแอป"}
    </button>
  );
}
