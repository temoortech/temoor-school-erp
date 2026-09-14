import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "soft" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        variant === "default" && "border-sky-200 bg-sky-50 text-sky-700",
        variant === "soft" && "border-slate-200 bg-slate-100 text-slate-700",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        className
      )}
      {...props}
    />
  );
}
