"use client";

import { OptimisticTabs } from "../_components/optimistic-tabs";

type Tab = "settings" | "evaluate";

/**
 * Horizontal tab nav above the body.
 *
 * MUST be a client component: it passes a `label` render-prop (a function of
 * the active state, for the badge restyle) to OptimisticTabs. A server parent
 * cannot pass a function across the RSC boundary — so the whole TabNav lives
 * client-side and the server page just renders <TabNav .../> with plain props.
 */
export function TabNav({
  gradeId,
  roomId,
  currentTab,
  characteristicCount,
}: {
  gradeId: string;
  roomId: string;
  currentTab: Tab;
  characteristicCount: number;
}) {
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    {
      id: "settings",
      label: "ตั้งค่าคุณลักษณะ",
      badge: characteristicCount,
    },
    { id: "evaluate", label: "ประเมินคุณลักษณะอันพึงประสงค์" },
  ];

  return (
    <div className="mb-4 flex gap-1 border-b border-zinc-200">
      <OptimisticTabs
        currentTab={currentTab}
        tabs={tabs.map((t) => {
          const params = new URLSearchParams();
          if (gradeId) params.set("grade", gradeId);
          if (roomId) params.set("room", roomId);
          params.set("tab", t.id);
          return {
            id: t.id,
            href: `/setup/characteristics?${params.toString()}`,
            label: (isActive: boolean) => (
              <>
                {t.label}
                {t.badge != null ? (
                  <span
                    className={
                      isActive
                        ? "rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                        : "rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600"
                    }
                  >
                    {t.badge}
                  </span>
                ) : null}
              </>
            ),
          };
        })}
        activeClass="-mb-px inline-flex items-center gap-1.5 border-b-2 border-rose-600 px-4 py-2.5 text-sm font-semibold text-rose-700"
        inactiveClass="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
      />
    </div>
  );
}
