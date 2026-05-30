import { cn } from "@pp5/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<typeof Link>, "children"> & {
  children?: ReactNode;
};

/**
 * Back-navigation link styled as a prominent button.
 *
 * Default label is "ย้อนกลับ" — override via children if needed.
 */
export function BackLink({ className, children, ...rest }: Props) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-300 hover:text-zinc-900",
        className,
      )}
      {...rest}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children ?? "ย้อนกลับ"}
    </Link>
  );
}
