import { VoucherStatus, ExamPublishStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export type NavigationItem = {
  href: string;
  label: string;
  moduleKey?: string;
};

export const ERP_NAVIGATION: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students", moduleKey: "students" },
  { href: "/admissions", label: "Admissions", moduleKey: "admissions" },
  { href: "/parents", label: "Parents", moduleKey: "parents" },
  { href: "/teachers-staff", label: "Teachers & Staff", moduleKey: "staff" },
  { href: "/attendance", label: "Attendance", moduleKey: "attendance" },
  { href: "/academics", label: "Academics", moduleKey: "academics" },
  { href: "/classes-sections", label: "Classes & Sections", moduleKey: "academics" },
  { href: "/timetable", label: "Timetable", moduleKey: "academics" },
  { href: "/exams-results", label: "Exams & Results", moduleKey: "exams" },
  { href: "/fees-finance", label: "Fees & Finance", moduleKey: "fees" },
  { href: "/library", label: "Library", moduleKey: "library" },
  { href: "/transport", label: "Transport", moduleKey: "transport" },
  { href: "/hostel", label: "Hostel", moduleKey: "hostel" },
  { href: "/inventory", label: "Inventory", moduleKey: "inventory" },
  { href: "/hr-leave", label: "HR & Leave", moduleKey: "hr" },
  { href: "/reports", label: "Reports", moduleKey: "reports" },
  { href: "/settings", label: "Settings", moduleKey: "settings" }
] as const;

export async function getShellContext(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      shortName: true,
      subdomain: true,
      branding: {
        select: {
          primaryColor: true,
          secondaryColor: true,
          accentColor: true
        }
      },
      campuses: {
        select: { id: true }
      },
      modules: {
        where: { isEnabled: true },
        select: { moduleKey: true }
      },
      academicSessions: {
        where: { isCurrent: true },
        select: { name: true },
        take: 1
      }
    }
  });

  if (!school) return null;

  return {
    school: {
      id: school.id,
      name: school.name,
      shortName: school.shortName,
      subdomain: school.subdomain,
      campusCount: school.campuses.length,
      activeModuleCount: school.modules.length,
      activeModuleKeys: school.modules.map((module) => module.moduleKey),
      currentSessionName: school.academicSessions[0]?.name || null,
      branding: school.branding
    }
  };
}

export async function getModuleAvailability(schoolId: string, moduleSlug: string) {
  const item = ERP_NAVIGATION.find((entry) => entry.href === `/${moduleSlug}`);
  if (!item?.moduleKey) return { isEnabled: false };

  const moduleRecord = await prisma.schoolModule.findFirst({
    where: {
      schoolId,
      moduleKey: item.moduleKey,
      isEnabled: true
    },
    select: { id: true }
  });

  return { isEnabled: Boolean(moduleRecord) };
}

export async function getDashboardData(schoolId: string) {
  const [school, campusCount, studentCount, parentCount, teacherCount, staffCount, classCount, sectionCount, admissionCount, pendingVoucherCount, examCount, paymentTotal, recentAdmissions, recentPayments] =
    await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          shortName: true,
          settings: {
            select: {
              currencySymbol: true
            }
          },
          academicSessions: {
            where: { isCurrent: true },
            select: {
              name: true,
              startDate: true,
              endDate: true
            },
            take: 1
          },
          modules: {
            where: { isEnabled: true },
            select: { moduleKey: true }
          }
        }
      }),
      prisma.campus.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parentProfile.count({ where: { schoolId } }),
      prisma.teacherProfile.count({ where: { schoolId } }),
      prisma.staffMember.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.section.count({ where: { schoolId } }),
      prisma.admissionInquiry.count({ where: { schoolId } }),
      prisma.feeVoucher.count({
        where: {
          schoolId,
          status: { in: [VoucherStatus.ISSUED, VoucherStatus.PARTIALLY_PAID, VoucherStatus.OVERDUE] }
        }
      }),
      prisma.exam.count({
        where: {
          schoolId,
          status: ExamPublishStatus.PUBLISHED
        }
      }),
      prisma.feePayment.aggregate({
        where: { schoolId },
        _sum: { amount: true }
      }),
      prisma.admissionInquiry.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          studentName: true,
          className: true,
          parentPhone: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.feePayment.findMany({
        where: { schoolId },
        orderBy: { paidAt: "desc" },
        take: 5,
        select: {
          id: true,
          receiptNo: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          voucher: {
            select: {
              student: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      })
    ]);

  return {
    school,
    campusCount,
    currentSession: school?.academicSessions[0] || null,
    enabledModules: school?.modules.map((module) => module.moduleKey) || [],
    currencySymbol: school?.settings?.currencySymbol || "Rs.",
    metrics: [
      {
        key: "students",
        label: "Students",
        value: studentCount.toLocaleString(),
        description: `${parentCount.toLocaleString()} linked parent profiles available for coordination.`
      },
      {
        key: "staff",
        label: "Teachers & staff",
        value: teacherCount.toLocaleString(),
        description: `${staffCount.toLocaleString()} staff records exist across the school.`
      },
      {
        key: "academics",
        label: "Classes & sections",
        value: `${classCount}/${sectionCount}`,
        description: "Live academic structure currently configured in the tenant database."
      },
      {
        key: "admissions",
        label: "Admission inquiries",
        value: admissionCount.toLocaleString(),
        description: "Prospective student leads captured for the school so far."
      },
      {
        key: "vouchers",
        label: "Pending vouchers",
        value: pendingVoucherCount.toLocaleString(),
        description: "Fee vouchers still issued, partially paid, or overdue."
      },
      {
        key: "collections",
        label: "Collected receipts",
        value: `${school?.settings?.currencySymbol || "Rs."} ${Number(paymentTotal._sum.amount || 0).toLocaleString("en-PK")}`,
        description: `${examCount.toLocaleString()} published exam records currently available.`
      }
    ],
    recentAdmissions,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      receiptNo: payment.receiptNo,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      studentName: payment.voucher.student.fullName
    }))
  };
}
