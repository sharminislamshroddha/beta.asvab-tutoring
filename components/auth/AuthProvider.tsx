"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import type { AuthUser } from "@/lib/auth-session";

type AuthContextValue = {
  user: AuthUser | null;
  authToken: string | null;
  loaded: boolean;
  loggingOut: boolean;
  setUser: (user: AuthUser | null) => void;
  refresh: () => Promise<boolean>;
  logout: (redirectTo?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthLoadingScreen() {
  return (
    <div
      className="auth-loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Image
        src="/images/asvab-tutoring-logo.webp"
        width={88}
        height={88}
        alt=""
        priority
      />
      <div className="auth-loading-spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}

async function fetchMe(): Promise<{
  user: AuthUser | null;
  authToken: string | null;
}> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.authenticated && data?.user) {
    return {
      user: data.user as AuthUser,
      authToken:
        typeof data.auth_token === "string" && data.auth_token
          ? data.auth_token
          : null,
    };
  }
  return { user: null, authToken: null };
}

export function AuthProvider({
  hasSession,
  children,
}: {
  hasSession: boolean;
  children: ReactNode;
}) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!hasSession);
  const [loggingOut, setLoggingOut] = useState(false);

  const applyMe = useCallback(
    (next: { user: AuthUser | null; authToken: string | null }) => {
      setUserState(next.user);
      setAuthToken(next.authToken);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMe();
      if (next.user) {
        applyMe(next);
        setLoaded(true);
        return true;
      }
      setLoaded(true);
      return false;
    } catch {
      setLoaded(true);
      return false;
    }
  }, [applyMe]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchMe();
        if (cancelled) return;
        applyMe(next);
      } catch {
        if (!cancelled) applyMe({ user: null, authToken: null });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next);
    if (next) setLoaded(true);
  }, []);

  const logout = useCallback(async (redirectTo = "/") => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      applyMe({ user: null, authToken: null });
      setLoggingOut(false);
      window.location.href = redirectTo || "/";
    }
  }, [applyMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authToken,
      loaded,
      loggingOut,
      setUser,
      refresh,
      logout,
    }),
    [user, authToken, loaded, loggingOut, setUser, refresh, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {hasSession && !loaded ? <AuthLoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
