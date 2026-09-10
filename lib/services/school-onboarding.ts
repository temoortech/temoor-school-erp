import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface ProvisionSchoolPayload {
  name: string;
  shortName?: string;
  code: string;
  subdomain: string;
  address?: string;
  city?: string;
  district?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  subscriptionPlan: string;
  enabledModuleKeys: string[];
  initialCampusName?: string;
  initialCampusCode?: string;
  initialSessionName?: string;
  sessionStartDate?: string;
  sessionEndDate?: string;
}

export async function provisionNewSchoolTransaction(payload: ProvisionSchoolPayload) {
  const existingSubdomain = await prisma.school.findUnique({ where: { subdomain: payload.subdomain } });
  if (existingSubdomain) throw new Error(`ONBOARDING_ERROR: Subdomain '${payload.subdomain}' is already in use.`);

  const existingCode = await prisma.school.findUnique({ where: { code: payload.code } });
  if (existingCode) throw new Error(`ONBOARDING_ERROR: School code '${payload.code}' is already in use.`);

  const passwordHash = await bcrypt.hash(payload.adminPassword, 12);

  return await prisma.$transaction(async (tx) => {
    // 1. Create School Core
    const school = await tx.school.create({
      data: {
        name: payload.name,
        shortName: payload.shortName,
        code: payload.code,
        subdomain: payload.subdomain,
        address: payload.address,
        city: payload.city,
        district: payload.district,
        province: payload.province || null,
        country: payload.country || "Pakistan",
        phone: payload.phone,
        email: payload.email,
        subscriptionPlan: payload.subscriptionPlan,
        status: "ACTIVE"
      }
    });

    // 2. Create User-Defined Main Campus
    const campus = await tx.campus.create({
      data: {
        schoolId: school.id,
        name: payload.initialCampusName || "Main Campus",
        code: payload.initialCampusCode || "MAIN",
        isMain: true,
        city: payload.city || null
      }
    });

    // 3. Create Settings & Branding
    await tx.schoolSettings.create({
      data: {
        schoolId: school.id,
        currency: "PKR",
        currencySymbol: "Rs.",
        timezone: "Asia/Karachi",
        isSetupComplete: true
      }
    });

    await tx.schoolBranding.create({
      data: {
        schoolId: school.id,
        primaryColor: "#0f172a",
        secondaryColor: "#0284c7",
        accentColor: "#f59e0b"
      }
    });

    // 4. Create Modules
    const defaultModules = ["students", "academics", "attendance", "fees", "exams", "communication"];
    const allModules = Array.from(new Set([...defaultModules, ...payload.enabledModuleKeys]));
    for (const key of allModules) {
      await tx.schoolModule.create({
        data: { schoolId: school.id, moduleKey: key, isEnabled: true }
      });
    }

    // 5. Create Academic Session
    const start = payload.sessionStartDate ? new Date(payload.sessionStartDate) : new Date("2026-04-01T00:00:00.000Z");
    const end = payload.sessionEndDate ? new Date(payload.sessionEndDate) : new Date("2027-03-31T00:00:00.000Z");
    const session = await tx.academicSession.create({
      data: {
        schoolId: school.id,
        name: payload.initialSessionName || "2026-2027",
        startDate: start,
        endDate: end,
        isCurrent: true
      }
    });

    // 6. Create Custom Role & Map Permissions
    const adminRole = await tx.customRole.create({
      data: {
        schoolId: school.id,
        name: "School Administrator",
        description: "Full administrative access for tenant."
      }
    });

    const systemPermissions = await tx.permission.findMany({ select: { id: true } });
    if (systemPermissions.length > 0) {
      await tx.rolePermission.createMany({
        data: systemPermissions.map(p => ({
          customRoleId: adminRole.id,
          permissionId: p.id
        }))
      });
    }

    // 7. Create Primary School Admin User
    const adminUser = await tx.user.create({
      data: {
        schoolId: school.id,
        campusId: campus.id,
        customRoleId: adminRole.id,
        name: payload.adminName,
        email: payload.adminEmail,
        passwordHash,
        role: "SCHOOL_ADMIN",
        isActive: true
      }
    });

    // 8. Create Subscription & Audit Log
    const subEndDate = new Date();
    subEndDate.setFullYear(subEndDate.getFullYear() + 1);
    await tx.schoolSubscription.create({
      data: {
        schoolId: school.id,
        planName: payload.subscriptionPlan,
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        endDate: subEndDate
      }
    });

    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        userId: adminUser.id,
        action: "TENANT_PROVISIONED",
        entity: "School",
        entityId: school.id,
        metadata: JSON.stringify({ code: school.code, plan: payload.subscriptionPlan, subdomain: school.subdomain })
      }
    });

    return { school, campus, adminUser, session, adminRole };
  });
}
