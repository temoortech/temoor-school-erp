"use client";

import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  breadcrumb: string;
  school: {
    shortName: string | null;
    name: string;
    currentSessionName: string | null;
  } | null;
  user: {
    name: string;
    email: string;
    role: string;
    campusName: string | null;
  };
  onOpenMenu: () => void;
}

export function Header({ breadcrumb, school, user, onOpenMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
            onClick={onOpenMenu}
          >
            <span className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{breadcrumb}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{school?.shortName || school?.name || "School workspace"}</h1>
              {school?.currentSessionName ? <Badge>{school.currentSessionName}</Badge> : <Badge variant="soft">Session pending</Badge>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.campusName ? <Badge variant="soft">{user.campusName}</Badge> : null}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
