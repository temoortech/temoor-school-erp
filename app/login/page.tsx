import { loginAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/ui/state";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
const errorMessages: Record<string, string> = {
  missing: "Enter both email address and password.",
  invalid: "The email or password is incorrect.",
  inactive: "This account is inactive. Please contact the school administrator.",
  config: "Authentication requires AUTH_SESSION_SECRET or NEXTAUTH_SECRET to be configured.",
  unknown: "Sign in could not be completed. Please try again."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const [schoolSummary, schoolCount, userCount] = await Promise.all([
    prisma.school.findFirst({
      select: {
        name: true,
        shortName: true,
        subdomain: true,
        branding: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.school.count(),
    prisma.user.count()
  ]);

  const hasSecret = Boolean(process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET);
  const errorMessage = searchParams?.error ? errorMessages[searchParams.error] || errorMessages.unknown : null;
  const canSubmit = hasSecret && userCount > 0;

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-slate-950 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.18),transparent_28%)]" />
          <div className="relative flex w-full flex-col justify-between p-12 text-slate-100">
            <div className="space-y-6">
              <Badge className="border-white/15 bg-white/10 text-slate-100">TEMOOR SCHOOL ERP</Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white">
                  Commercial-grade school operations for multi-campus administration.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300">
                  A focused ERP foundation for academics, admissions, attendance, finance, staff, and reporting with tenant-isolated data.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Schools</p>
                <p className="mt-3 text-3xl font-semibold text-white">{schoolCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">User Accounts</p>
                <p className="mt-3 text-3xl font-semibold text-white">{userCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Tenant Mode</p>
                <p className="mt-3 text-3xl font-semibold text-white">Live</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl space-y-6">
            <div className="space-y-3 lg:hidden">
              <Badge>TEMOOR SCHOOL ERP</Badge>
              <h1 className="text-3xl font-semibold text-white">School ERP sign in</h1>
            </div>

            <Card className="border-slate-800 bg-white/95 shadow-2xl shadow-slate-950/20">
              <CardHeader className="space-y-4 border-b border-slate-200/80 pb-6">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">Welcome back</CardTitle>
                  <CardDescription>
                    Sign in with an existing account to access the ERP shell and live school data.
                  </CardDescription>
                </div>

                {schoolSummary ? (
                  <div
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    style={
                      {
                        borderColor: schoolSummary.branding?.secondaryColor || undefined,
                        backgroundColor: `${schoolSummary.branding?.primaryColor || "#0f172a"}08`
                      } as React.CSSProperties
                    }
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Primary tenant</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {schoolSummary.shortName || schoolSummary.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{schoolSummary.subdomain} ERP tenancy is active.</p>
                  </div>
                ) : (
                  <EmptyState
                    title="No school tenant found"
                    description="Create or provision a school record before users can sign in."
                    compact
                  />
                )}
              </CardHeader>

              <CardContent className="space-y-5 pt-6">
                {errorMessage ? <ErrorState title="Sign in unavailable" description={errorMessage} compact /> : null}

                {!hasSecret ? (
                  <ErrorState
                    title="Session secret missing"
                    description="Set AUTH_SESSION_SECRET or NEXTAUTH_SECRET to enable secure login sessions."
                    compact
                  />
                ) : null}

                {userCount === 0 ? (
                  <EmptyState
                    title="No user accounts available"
                    description="Provision at least one school administrator or staff account before signing in."
                    compact
                  />
                ) : null}

                <form action={loginAction} className="space-y-4">
                  <FormField label="Email address" hint="Use the email stored on the existing User record.">
                    <Input type="email" name="email" placeholder="admin@school.com" autoComplete="email" required />
                  </FormField>

                  <FormField label="Password" hint="Passwords are verified against the existing bcrypt passwordHash.">
                    <Input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
                  </FormField>

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    Sign in to ERP
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
