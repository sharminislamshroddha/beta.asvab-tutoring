import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/seo";

const BIND_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function firstHeaderValue(value: string | null): string {
  return (value ?? "").split(",")[0].trim();
}

function hostnameOf(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end >= 0 ? trimmed.slice(0, end + 1) : trimmed;
  }
  return trimmed.split(":")[0];
}

function isBindHost(host: string): boolean {
  return BIND_HOSTS.has(hostnameOf(host));
}

function isLoopbackHost(host: string): boolean {
  const hostname = hostnameOf(host);
  return LOOPBACK_HOSTS.has(hostname) || isBindHost(host);
}

function originFromHost(host: string, proto: string): string | null {
  if (!host || isLoopbackHost(host)) return null;
  const protocol = proto === "http" ? "http" : "https";
  let authority = host;
  if (protocol === "https" && authority.endsWith(":443")) {
    authority = authority.slice(0, -4);
  }
  if (protocol === "http" && authority.endsWith(":80")) {
    authority = authority.slice(0, -3);
  }
  return `${protocol}://${authority}`;
}

/**
 * Public origin for redirects. `req.url` is `https://0.0.0.0:3000` when
 * `next start -H 0.0.0.0` sits behind nginx without rewriting the request URL.
 */
export function getPublicRequestOrigin(req: NextRequest): string {
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const host = firstHeaderValue(req.headers.get("host"));

  const fromForwarded = originFromHost(
    forwardedHost,
    forwardedProto || "https",
  );
  if (fromForwarded) return fromForwarded;

  const fromHost = originFromHost(
    host,
    forwardedProto || (req.nextUrl.protocol === "http:" ? "http" : "https"),
  );
  if (fromHost) return fromHost;

  try {
    const url = new URL(req.url);
    if (isBindHost(url.hostname)) {
      return SITE_URL.replace(/\/$/, "");
    }
    return url.origin;
  } catch {
    return SITE_URL.replace(/\/$/, "");
  }
}

export function publicRequestUrl(path: string, req: NextRequest): URL {
  return new URL(path, `${getPublicRequestOrigin(req)}/`);
}
