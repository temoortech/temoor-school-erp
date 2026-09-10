import { AsyncLocalStorage } from "async_hooks";
export interface TenantContext {
  userId: string;
  schoolId: string;
  role: string;
  customRoleId?: string | null;
  isSuperAdmin: boolean;
}
export const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
export async function getTenantContext(): Promise<TenantContext> {
  const store = asyncLocalStorage.getStore();
  if (!store) throw new Error("UNAUTHORIZED_TENANT_ACCESS: No tenant context found.");
  return store;
}
export async function requireSchoolAccess(schoolId: string) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin && ctx.schoolId !== schoolId) {
    throw new Error("SECURITY_REJECTION: Cross-tenant access forbidden.");
  }
}
