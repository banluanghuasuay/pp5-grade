import type { ReactNode } from "react";
import { cn } from "./utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  variant?: BadgeVariant;
  /** Show a dot before the text (status indicator style). */
  withDot?: boolean;
  className?: string;
  children: ReactNode;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-900",
  info: "bg-primary-100 text-primary-900",
  neutral: "bg-zinc-100 text-zinc-700",
};

export function Badge({
  variant = "neutral",
  withDot = false,
  className,
  children,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {withDot && <span aria-hidden>●</span>}
      {children}
    </span>
  );
}
