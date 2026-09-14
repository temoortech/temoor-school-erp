import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import { getSessionUser } from "@/lib/auth";
import { ERP_NAVIGATION, getModuleAvailability } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export default async function ModulePlaceholderPage({ params }: { params: { module: string } }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const navigationItem = ERP_NAVIGATION.find((item) => item.href === `/${params.module}`);
  if (params.module === "dashboard") {
    redirect("/dashboard");
  }

  if (!navigationItem || !user.schoolId) {
    notFound();
  }

  const availability = await getModuleAvailability(user.schoolId, params.module);

  if (!availability.isEnabled) {
    notFound();
  }

  const title = navigationItem.label;

  return (
    <div className="page-shell space-y-6">
      <div className="space-y-3">
        <Badge variant="soft">Phase 1 placeholder</Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight capitalize">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            The application shell is ready. This module route is reserved for the next delivery phase without changing existing backend structures.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module status</CardTitle>
          <CardDescription>Navigation is live while the module screens remain intentionally deferred.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Module UI not implemented yet"
            description="This enabled module route is reserved for Phase 2 while the shared ERP shell remains available now."
            compact
          />
        </CardContent>
      </Card>
    </div>
  );
}
