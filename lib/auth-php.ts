import type { AuthUser } from "@/lib/auth-session";

function phpApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_PHP_API_URL?.trim() || "";
  if (!url) throw new Error("NEXT_PUBLIC_PHP_API_URL is not configured");
  return url;
}

function phpHeaders(): HeadersInit {
  const secret = process.env.INTERNAL_API_SECRET?.trim() || "";
  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json,text/plain,*/*",
    ...(secret ? { "X-ASVAB-SECRET": secret } : {}),
  };
}

async function postPhp(
  params: Record<string, string>,
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(phpApiUrl(), {
    method: "POST",
    headers: phpHeaders(),
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json };
}

export type PhpLoginSuccess = {
  auth_token: string;
  user_id: number;
  portalUrl: string;
  paidUser: boolean;
  user: AuthUser;
  message: string;
};

function parsePhpPaidUser(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export async function phpUserLogin(
  email: string,
  password: string,
): Promise<
  | { ok: true; data: PhpLoginSuccess }
  | { ok: false; message: string; status: number }
> {
  const { ok, status, json } = await postPhp({
    action: "user-login",
    email,
    password,
  });

  const phpLoginOk =
    Boolean(json) &&
    (json.isSuccess === true ||
      json.isSuccess === 1 ||
      json.isSuccess === "true" ||
      Number(json.status) === 200);

  const authToken =
    typeof json?.auth_token === "string" ? json.auth_token.trim() : "";

  if (phpLoginOk && !authToken) {
    console.error("[phpUserLogin] PHP login succeeded without auth_token", {
      user_id: json?.user_id ?? json?.data?.user_id ?? null,
    });
    return {
      ok: false,
      message:
        "We verified your account, but couldn't start your session. Please try again in a moment. If this continues, contact support.",
      status: 502,
    };
  }

  if (!phpLoginOk || !authToken) {
    return {
      ok: false,
      message:
        String(json?.message || "").trim() ||
        "Invalid email or password. Please try again.",
      status: status === 401 || json?.status === 401 ? 401 : 400,
    };
  }

  const user_id = Number(json.user_id ?? json.data?.user_id ?? 0);
  if (!user_id) {
    console.error("[phpUserLogin] PHP login succeeded without user_id");
    return {
      ok: false,
      message:
        "We verified your account, but couldn't start your session. Please try again in a moment. If this continues, contact support.",
      status: 500,
    };
  }

  return {
    ok: true,
    data: {
      auth_token: authToken,
      user_id,
      portalUrl: String(json.url || ""),
      paidUser: parsePhpPaidUser(json.paid_user),
      message: String(json.message || "Login successful."),
      user: {
        user_id,
        first_name: String(json.data?.first_name ?? ""),
        last_name: String(json.data?.last_name ?? ""),
        email: String(json.data?.email ?? email).toLowerCase(),
      },
    },
  };
}

export async function phpAuthTokenLookup(
  auth_token: string,
): Promise<AuthUser | null> {
  const detailed = await phpAuthTokenLookupDetailed(auth_token);
  return detailed?.user ?? null;
}

export async function phpAuthTokenLookupDetailed(
  auth_token: string,
): Promise<{ user: AuthUser; portalUrl: string } | null> {
  const { ok, json } = await postPhp({
    action: "auth-token-lookup",
    auth_token,
  });

  if (!ok || !json || json.ok !== true || !json.user) return null;

  const user_id = Number(json.user.user_id ?? 0);
  if (!user_id) return null;

  return {
    user: {
      user_id,
      first_name: String(json.user.first_name ?? ""),
      last_name: String(json.user.last_name ?? ""),
      email: String(json.user.email ?? ""),
      square_customer_id: String(json.user.square_customer_id ?? ""),
    },
    portalUrl: String(json.url ?? "").trim(),
  };
}
