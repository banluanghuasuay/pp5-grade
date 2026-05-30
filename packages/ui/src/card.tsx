import type { ReactNode } from "react";
import { cn } from "./utils";

type CardProps = {
  /** Optional padding override — defaults to `p-6` on the body. Set to `false` to remove. */
  padding?: "sm" | "md" | "lg" | false;
  /** Variant — `default` (border + bg-white) or `dashed` (placeholder/empty-state look). */
  variant?: "default" | "dashed" | "warning";
  className?: string;
  children: ReactNode;
};

const PADDING_CLASS: Record<Exclude<CardProps["padding"], false | undefined>, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const VARIANT_CLASS: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "border border-zinc-200 bg-white",
  dashed: "border border-dashed border-zinc-300 bg-white",
  warning: "border border-amber-200 bg-amber-50",
};

/**
 * Basic container card.
 *
 * Example:
 *   <Card>Form content</Card>
 *   <Card variant="dashed">Empty state</Card>
 *   <Card variant="warning" padding="sm">⚠️ alert</Card>
 */
export function Card({
  padding = "md",
  variant = "default",
  className,
  children,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        VARIANT_CLASS[variant],
        padding !== false && PADDING_CLASS[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
