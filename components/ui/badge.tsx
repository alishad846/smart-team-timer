import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}) {
  const variants = {
    default: "bg-primary/10 text-primary",
    secondary: "bg-muted text-muted-foreground",
    outline: "border border-border bg-transparent text-foreground",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
