import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE_NAME = "cc_auth";

function authConfig() {
  const username = process.env.AUTH_USERNAME ?? "admin";
  const password = process.env.AUTH_PASSWORD ?? "admin123";
  const secret = process.env.AUTH_SECRET ?? "cobros-secret-local";

  return { username, password, secret };
}

function buildToken(): string {
  const { username, password, secret } = authConfig();
  return crypto
    .createHash("sha256")
    .update(`${username}:${password}:${secret}`)
    .digest("hex");
}

export async function hasSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return Boolean(session && session === buildToken());
}

export async function requireAuth(): Promise<void> {
  if (!(await hasSession())) {
    redirect("/login");
  }
}

export async function createSession(username: string, password: string): Promise<boolean> {
  const cfg = authConfig();
  if (username !== cfg.username || password !== cfg.password) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, buildToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return true;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
