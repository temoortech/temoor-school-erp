import { cn } from "@/lib/utils";

export function FormField({
  label,
  hint,
  htmlFor,
  className,
  children
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </div>
  );
}
