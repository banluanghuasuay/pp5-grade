import type { SelectHTMLAttributes } from "react";
import { cn } from "./utils";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({
  invalid = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm",
        "focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
        "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500",
        "aria-invalid:border-red-400",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
