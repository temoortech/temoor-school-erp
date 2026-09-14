import { cn } from "@/lib/utils";

function StateIcon({ tone }: { tone: "empty" | "error" | "loading" }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl border",
        tone === "empty" && "border-slate-200 bg-slate-100 text-slate-500",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-600",
        tone === "loading" && "border-sky-200 bg-sky-50 text-sky-600"
      )}
    >
      <span className={cn("block h-2.5 w-2.5 rounded-full", tone === "loading" && "animate-pulse", tone === "empty" && "bg-current", tone === "error" && "bg-current", tone === "loading" && "bg-current")} />
    </div>
  );
}

function StatePanel({
  title,
  description,
  action,
  className,
  tone = "empty",
  compact = false
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "empty" | "error" | "loading";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-muted flex flex-col items-start gap-4 p-6 text-left",
        compact && "rounded-xl p-4",
        className
      )}
    >
      <StateIcon tone={tone} />
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: Omit<Parameters<typeof StatePanel>[0], "tone">) {
  return <StatePanel tone="empty" {...props} />;
}

export function ErrorState(props: Omit<Parameters<typeof StatePanel>[0], "tone">) {
  return <StatePanel tone="error" {...props} />;
}

export function LoadingState(props: Omit<Parameters<typeof StatePanel>[0], "tone">) {
  return <StatePanel tone="loading" {...props} />;
}
