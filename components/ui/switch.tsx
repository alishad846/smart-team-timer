"use client";

import { cn } from "@/lib/utils";

type SwitchProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
};

export function Switch({ className, checked = false, ...props }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
