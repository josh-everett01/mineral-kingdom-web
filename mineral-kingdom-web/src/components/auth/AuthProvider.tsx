"use client";

import * as React from "react";
import type { AuthMe } from "@/lib/auth/types";

type AuthContextValue = {
  me: AuthMe;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const emptyMe: AuthMe = { isAuthenticated: false, user: null, roles: [] };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = React.useState<AuthMe>(emptyMe);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshMe = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bff/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setMe(emptyMe);
        return;
      }
      const data = (await res.json()) as AuthMe;
      setMe(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await fetch("/api/bff/auth/logout", { method: "POST" }).catch(() => {});
    setMe(emptyMe);
  }, []);

  React.useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  return (
    <AuthContext.Provider value={{ me, isLoading, refreshMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}