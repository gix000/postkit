"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  busyLabel,
  className = "btn btn--quiet",
}: {
  label: string;
  busyLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && busyLabel ? busyLabel : label}
    </button>
  );
}
