"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, type MeResponse } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getHomePath, resolveAppRole, type AppRole } from "@/lib/roles";

type AuthContextValue = {
  user: MeResponse | null;
  role: AppRole;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const role = resolveAppRole(user);

  const value = useMemo(
    () => ({ user, role, loading, refresh, logout }),
    [user, role, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireAuth(redirectTo = "/login"): AuthContextValue {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace(redirectTo);
    }
  }, [auth.loading, auth.user, redirectTo, router]);

  return auth;
}

export function useRoleRedirect(): void {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user) {
      router.replace(getHomePath(auth.role));
    }
  }, [auth.loading, auth.user, auth.role, router]);
}
