import { PrismaClient } from "@prisma/client";
import { asyncLocalStorage, TenantContext } from "@/lib/tenant";

const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl || !testDbUrl.includes("test")) {
  throw new Error("FATAL_TEST_ERROR: Valid TEST_DATABASE_URL containing 'test' is required.");
}

export const testPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

export async function runWithTestTenantContext<T>(context: TenantContext, fn: () => Promise<T>): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}
