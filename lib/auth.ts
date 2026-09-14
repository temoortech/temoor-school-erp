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
const DUMMY_PASSWORD_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO1kA4hQgv6FQJ8E2G7A6bJmG7aN0jQ5W";

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

function getCookieScope() {
  const domain = process.env.SESSION_COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || Boolean(domain),
    sameSite: "lax" as const,
    path: "/",
    domain,
    priority: "high" as const
  };
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function clearSessionCookie(cookieStore: CookieStore) {
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getCookieScope(),
    maxAge: 0,
    expires: new Date(0)
  });
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

  const latestSessionEvent = await prisma.auditLog.findFirst({
    where: {
      userId: session.userId,
      entity: SESSION_ENTITY,
      entityId: session.sessionId,
      action: {
        in: [SESSION_ISSUED_ACTION, SESSION_REVOKED_ACTION]
      }
    },
    orderBy: { timestamp: "desc" },
    select: { action: true }
  });

  return latestSessionEvent?.action === SESSION_ISSUED_ACTION;
}

export async function signInWithCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...sessionUserSelect,
      passwordHash: true
    }
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("INACTIVE_USER");
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

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...getCookieScope(),
    maxAge: SESSION_MAX_AGE_MS / 1000,
    expires: new Date(expiresAt)
  });
}

export async function signOut() {
  const cookieStore = await cookies();
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

  clearSessionCookie(cookieStore);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = decodeSession(token);

  if (!session || !(await isSessionActive(session))) {
    clearSessionCookie(cookieStore);
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: sessionUserSelect
  });

  if (!user || !user.isActive) {
    clearSessionCookie(cookieStore);
    return null;
  }

  return user;
}
