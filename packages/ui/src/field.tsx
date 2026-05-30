import type { ReactNode } from "react";
import { cn } from "./utils";

type Props = {
  label: string;
  /** Show red asterisk after the label. */
  required?: boolean;
  /** Inline error message in red. Takes precedence over `hint`. */
  error?: string;
  /** Helper text in gray. Hidden when an `error` is shown. */
  hint?: ReactNode;
  /** The form control(s) — usually `<Input>` / `<Select>` / `<Textarea>`. */
  children: ReactNode;
  className?: string;
};

/**
 * Form field wrapper: label + control + (hint or error).
 *
 * Example:
 *   <Field label="ชื่อ" required error={state.fieldErrors?.name}>
 *     <Input name="name" required />
 *   </Field>
 */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: Props) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-zinc-900">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className={cn("mt-1 text-xs text-red-600")}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}
