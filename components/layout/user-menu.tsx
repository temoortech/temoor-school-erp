"use client";

import { useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function UserMenu({
  user
}: {
  user: {
    name: string;
    email: string;
    role: string;
    campusName: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
          {user.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold text-slate-950">{user.name}</p>
          <p className="text-xs text-slate-500">{user.role.replace(/_/g, " ")}</p>
        </div>
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          aria-label="User panel"
          className="absolute right-0 z-30 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-950">{user.name}</p>
            <p className="text-sm text-slate-600">{user.email}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{user.role.replace(/_/g, " ")}</Badge>
              {user.campusName ? <Badge variant="soft">{user.campusName}</Badge> : null}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                Sign out
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
