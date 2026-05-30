import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./utils";

type Props = {
  icon: LucideIcon;
  /** Tailwind classes for the icon container — e.g. "bg-emerald-100 text-emerald-700". */
  iconBg?: string;
  title: string;
  description?: ReactNode;
  /** Right-aligned action(s) like a "+ Add" button. */
  action?: ReactNode;
  className?: string;
};

/**
 * Page header with colored icon + title + optional description + action.
 *
 * Each setup section uses its signature color via `iconBg`:
 *   - schools → indigo
 *   - academic-years → purple
 *   - classrooms → pink
 *   - teachers → emerald
 *   - students → sky
 *   - subjects → amber
 */
export function PageHeader({
  icon: Icon,
  iconBg = "bg-primary-100 text-primary-700",
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            iconBg,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-600">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
