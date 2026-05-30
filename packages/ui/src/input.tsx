import type { InputHTMLAttributes } from "react";
import { cn } from "./utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Add red border to signal validation error (paired with Field's error prop). */
  invalid?: boolean;
};

export function Input({
  invalid = false,
  className,
  type = "text",
  ...rest
}: Props) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm",
        "placeholder:text-zinc-400",
        "focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
        "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500",
        "read-only:bg-zinc-100",
        "aria-invalid:border-red-400",
        className,
      )}
      {...rest}
    />
  );
}
