"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { NavigationItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface SidebarProps {
  navigation: readonly NavigationItem[];
  pathname: string;
  school: {
    name: string;
    shortName: string | null;
    subdomain: string;
    campusCount: number;
    currentSessionName: string | null;
    activeModuleCount: number;
    activeModuleKeys: string[];
  } | null;
  onNavigate: () => void;
}

export function Sidebar({ navigation, pathname, school, onNavigate }: SidebarProps) {
  const enabledLinks = navigation.filter((item) => item.href === "/dashboard" || (item.moduleKey && school?.activeModuleKeys.includes(item.moduleKey)));
  const plannedModules = navigation.filter((item) => item.href !== "/dashboard" && (!item.moduleKey || !school?.activeModuleKeys.includes(item.moduleKey)));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
            {(school?.shortName || school?.name || "TS").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-white">{school?.shortName || school?.name || "TEMOOR SCHOOL ERP"}</p>
            <p className="truncate text-xs text-slate-400">{school?.subdomain || "tenant"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <div>
            <p className="uppercase tracking-[0.2em] text-slate-500">Campuses</p>
            <p className="mt-2 text-lg font-semibold text-white">{school?.campusCount ?? 0}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.2em] text-slate-500">Modules</p>
            <p className="mt-2 text-lg font-semibold text-white">{school?.activeModuleCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          <span>Navigation</span>
          {school?.currentSessionName ? <Badge variant="soft">{school.currentSessionName}</Badge> : null}
        </div>
        <nav className="space-y-1">
          {enabledLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                  active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold",
                    active
                      ? "border-slate-200 bg-slate-100 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-300 group-hover:border-white/20 group-hover:text-white"
                  )}
                >
                  {item.label
                    .split(/\s|&/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {plannedModules.length > 0 ? (
          <div className="mt-6 space-y-3 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Planned modules</p>
            <div className="flex flex-wrap gap-2">
              {plannedModules.map((item) => (
                <span
                  key={item.href}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
