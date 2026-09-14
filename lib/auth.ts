import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const SESSION_COOKIE_NAME = "temoor_erp_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const SESSION_ENTITY = "Session";
const SESSION_ISSUED_ACTION = "AUTH_SESSION_ISSUED";
const SESSION_REVOKED_ACTION = "AUTH_SESSION_REVOKED";

const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isSuperAdmin: true,
  schoolId: true,
  campusId: true,
  isActive: true,
  school: {
    select: {
      id: true,
      name: true,
      shortName: true,
      subdomain: true
    }
  },
  campus: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

type SessionPayload = {
  userId: string;
  sessionId: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_CONFIGURATION_ERROR: Missing AUTH_SESSION_SECRET or NEXTAUTH_SECRET.");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded);
  const providedBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.sessionId || !payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

async function isSessionActive(session: SessionPayload) {
  if (session.expiresAt <= Date.now()) {
    return false;
  }

  const [issuedLog, revokedLog] = await Promise.all([
    prisma.auditLog.findFirst({
      where: {
        userId: session.userId,
        action: SESSION_ISSUED_ACTION,
        entity: SESSION_ENTITY,
        entityId: session.sessionId
      },
      select: { id: true }
    }),
    prisma.auditLog.findFirst({
      where: {
        userId: session.userId,
        action: SESSION_REVOKED_ACTION,
        entity: SESSION_ENTITY,
        entityId: session.sessionId
      },
      select: { id: true }
    })
  ]);

  return Boolean(issuedLog) && !revokedLog;
}

export async function signInWithCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...sessionUserSelect,
      passwordHash: true
    }
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("INACTIVE_USER");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const sessionId = randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      userId: user.id,
      action: SESSION_ISSUED_ACTION,
      entity: SESSION_ENTITY,
      entityId: sessionId,
      metadata: JSON.stringify({ expiresAt })
    }
  });

  const token = encodeSession({ userId: user.id, sessionId, expiresAt });

  const cookieDomain = process.env.SESSION_COOKIE_DOMAIN || undefined;

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
    maxAge: SESSION_MAX_AGE_MS / 1000,
    expires: new Date(expiresAt)
  });
}

export async function signOut() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? decodeSession(token) : null;

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, schoolId: true }
    });

    await prisma.auditLog.create({
      data: {
        schoolId: user?.schoolId || null,
        userId: session.userId,
        action: SESSION_REVOKED_ACTION,
        entity: SESSION_ENTITY,
        entityId: session.sessionId,
        metadata: JSON.stringify({ revokedAt: Date.now() })
      }
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = decodeSession(token);

  if (!session || !(await isSessionActive(session))) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: sessionUserSelect
  });

  if (!user || !user.isActive) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return user;
}
