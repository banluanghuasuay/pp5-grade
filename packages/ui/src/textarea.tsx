import type { TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({
  invalid = false,
  className,
  rows = 3,
  ...rest
}: Props) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm",
        "placeholder:text-zinc-400",
        "focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
        "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500",
        "aria-invalid:border-red-400",
        className,
      )}
      {...rest}
    />
  );
}
