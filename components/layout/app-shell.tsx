"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

import type { NavigationItem } from "@/lib/dashboard";

interface AppShellProps {
  children: ReactNode;
  navigation: readonly NavigationItem[];
  school: {
    id: string;
    name: string;
    shortName: string | null;
    subdomain: string;
    campusCount: number;
    currentSessionName: string | null;
    activeModuleCount: number;
    activeModuleKeys: string[];
    branding: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
    } | null;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    campusName: string | null;
  };
}

export function AppShell({ children, navigation, school, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumb = useMemo(() => {
    const current = navigation.find((item) => pathname === item.href) || navigation.find((item) => pathname.startsWith(`${item.href}/`));
    return current?.label || "Workspace";
  }, [navigation, pathname]);

  const brandStyle =
    school?.branding
      ? ({
          ["--brand-primary" as string]: school.branding.primaryColor,
          ["--brand-secondary" as string]: school.branding.secondaryColor,
          ["--brand-accent" as string]: school.branding.accentColor
        } as CSSProperties)
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50" style={brandStyle}>
      <div className="flex min-h-screen">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 w-[280px] transform border-r border-slate-200 bg-slate-950 text-slate-100 transition-transform duration-200 md:static md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          ].join(" ")}
        >
          <Sidebar navigation={navigation} pathname={pathname} school={school} onNavigate={() => setMobileOpen(false)} />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header breadcrumb={breadcrumb} school={school} user={user} onOpenMenu={() => setMobileOpen(true)} />
          <main className="min-w-0 flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {school ? `${school.shortName || school.name} • ${school.subdomain}` : "TEMOOR SCHOOL ERP"}
              </p>
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="hover:text-slate-900">
                  Dashboard
                </Link>
                <span>Phase 1 shell</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
