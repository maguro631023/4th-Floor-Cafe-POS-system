import { getIronSession, SessionOptions, unsealData } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionUser;
  }
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "change-me-in-production-min-32-chars!!",
  cookieName: "4f_pos_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax" as const,
  },
};

/** 從 cookie 字串讀取 session（供 middleware 使用） */
export async function getSessionFromCookie(cookieValue: string): Promise<{ user?: SessionUser } | null> {
  try {
    const data = await unsealData<{ user?: SessionUser }>(cookieValue, {
      password: sessionOptions.password,
    });
    return data;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

export async function setSession(user: SessionUser) {
  const session = await getSession();
  session.user = user;
  await session.save();
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function canAccessUserManagement(role: SessionUser["role"]): boolean {
  return role === "ADMIN";
}
