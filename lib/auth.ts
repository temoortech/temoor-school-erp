import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const SESSION_COOKIE_NAME = "temoor_erp_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

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

type SessionRecord = {
  userId: string;
  expiresAt: number;
};

const globalForSessions = globalThis as typeof globalThis & {
  erpSessionStore?: Map<string, SessionRecord>;
};

const sessionStore = globalForSessions.erpSessionStore ?? new Map<string, SessionRecord>();

if (!globalForSessions.erpSessionStore) {
  globalForSessions.erpSessionStore = sessionStore;
}

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

function cleanupExpiredSessions() {
  const now = Date.now();
  sessionStore.forEach((session, sessionId) => {
    if (session.expiresAt <= now) {
      sessionStore.delete(sessionId);
    }
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

  cleanupExpiredSessions();

  const sessionId = randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  sessionStore.set(sessionId, { userId: user.id, expiresAt });
  const token = encodeSession({ userId: user.id, sessionId, expiresAt });

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    expires: new Date(expiresAt)
  });
}

export async function signOut() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? decodeSession(token) : null;

  if (session) {
    sessionStore.delete(session.sessionId);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  cleanupExpiredSessions();
  const session = decodeSession(token);

  if (!session || session.expiresAt <= Date.now()) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const activeSession = sessionStore.get(session.sessionId);

  if (!activeSession || activeSession.userId !== session.userId || activeSession.expiresAt <= Date.now()) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    sessionStore.delete(session.sessionId);
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: sessionUserSelect
  });

  if (!user || !user.isActive) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    sessionStore.delete(session.sessionId);
    return null;
  }

  return user;
}
