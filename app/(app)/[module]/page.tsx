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
  if (!navigationItem) {
    notFound();
  }

  const availability = user.schoolId ? await getModuleAvailability(user.schoolId, params.module) : null;

  if (!user.isSuperAdmin && !availability?.isEnabled) {
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
            description={
              availability?.isEnabled
                ? "This module is already enabled for the current school and can be connected in Phase 2."
                : "This module is not yet enabled for the current school, or the backend enablement record does not exist yet."
            }
            compact
          />
        </CardContent>
      </Card>
    </div>
  );
}
