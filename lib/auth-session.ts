import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "asvab_session";
const SESSION_DAYS = 7;

export type AuthSession = {
  auth_token: string;
  user_id: number;
  exp: number;
};

export type AuthUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  square_customer_id?: string;
};

function getSessionSecret(): string {
  const secret =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim() ||
    "";
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET or INTERNAL_API_SECRET is required");
  }
  return secret;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function encodeSession(session: Omit<AuthSession, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payloadB64 = b64urlEncode(
    JSON.stringify({
      auth_token: session.auth_token,
      user_id: session.user_id,
      exp,
    }),
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function decodeSession(raw: string | undefined | null): AuthSession | null {
  if (!raw || !raw.includes(".")) return null;
  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) return null;

  let expected: string;
  try {
    expected = sign(payloadB64);
  } catch {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64)) as AuthSession;
    if (
      !parsed?.auth_token ||
      !parsed?.user_id ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      auth_token: String(parsed.auth_token),
      user_id: Number(parsed.user_id),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(session: {
  auth_token: string;
  user_id: number;
}): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(session), sessionCookieOptions());
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
