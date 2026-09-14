import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const dashboardViews = [
  { key: "overview", label: "Overview" },
  { key: "admissions", label: "Admissions" },
  { key: "finance", label: "Finance" }
] as const;

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { view?: string };
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.schoolId) {
    return (
      <div className="page-shell">
        <EmptyState
          title="No school tenant assigned"
          description="This account is not attached to a school record, so dashboard data cannot be loaded yet."
        />
      </div>
    );
  }

  const view = dashboardViews.some((item) => item.key === searchParams?.view) ? searchParams?.view || "overview" : "overview";
  const dashboard = await getDashboardData(user.schoolId);
  const summaryCards = view === "finance" ? dashboard.metrics.slice(3) : view === "admissions" ? dashboard.metrics.slice(0, 3) : dashboard.metrics;

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">Dashboard</Badge>
            {dashboard.currentSession ? <Badge>{dashboard.currentSession.name}</Badge> : <Badge variant="soft">Session unavailable</Badge>}
            <Badge variant="soft">School-wide view</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Operational overview</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Live activity for student records, staffing, admissions, assessments, and collections using the current school data already stored in Prisma.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dashboardViews.map((item) => (
            <Link
              key={item.key}
              href={item.key === "overview" ? "/dashboard" : `/dashboard?view=${item.key}`}
              className={cn(
                buttonStyles({ variant: view === item.key ? "primary" : "secondary", size: "sm" }),
                "min-w-[112px] justify-center"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>{view === "finance" ? "Recent collections" : "Recent admissions"}</CardTitle>
            <CardDescription>
              {view === "finance"
                ? "Most recent fee receipts recorded for the current school."
                : "Newest admission inquiries captured in the existing database."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "finance" ? (
              dashboard.recentPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Paid at</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium text-slate-900">{payment.receiptNo}</TableCell>
                        <TableCell>{payment.studentName}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{formatDate(payment.paidAt)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount, dashboard.currencySymbol)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="No fee payments yet"
                  description="Receipts will appear here once collections are recorded through the existing finance workflow."
                  compact
                />
              )
            ) : dashboard.recentAdmissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.recentAdmissions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-900">{item.studentName}</TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell>{item.parentPhone}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "NEW" ? "warning" : "soft"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No admissions yet"
                description="New admission inquiries will appear here when the admissions workflow starts capturing leads."
                compact
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>School profile</CardTitle>
              <CardDescription>Current tenant readiness and academic context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Current session</p>
                  <p>{dashboard.currentSession ? dashboard.currentSession.name : "Not configured"}</p>
                </div>
                <Badge variant={dashboard.currentSession ? "success" : "soft"}>
                  {dashboard.currentSession ? "Active" : "Pending"}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Campuses</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{dashboard.campusCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Enabled modules</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{dashboard.enabledModules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active modules</CardTitle>
              <CardDescription>Modules enabled for the current school record.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.enabledModules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dashboard.enabledModules.map((moduleKey) => (
                    <Badge key={moduleKey}>{moduleKey}</Badge>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No modules enabled"
                  description="SchoolModule records are required before module-level navigation can be activated."
                  compact
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
