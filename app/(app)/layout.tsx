import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth";
import { ERP_NAVIGATION, getShellContext } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const shell = user.schoolId ? await getShellContext(user.schoolId) : null;

  return (
    <AppShell
      navigation={ERP_NAVIGATION}
      school={shell?.school || null}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        campusName: user.campus?.name || null
      }}
    >
      {children}
    </AppShell>
  );
}
