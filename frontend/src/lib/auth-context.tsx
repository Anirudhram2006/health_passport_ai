"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, UserRole } from "@/types";
import { api } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<User>;
  register: (data: { name: string; email: string; password: string; role: UserRole; bloodGroup?: string; phone?: string; specialty?: string; license?: string; hospital?: string }) => Promise<void>;
  logout: () => void;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hpa_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const persist = useCallback((u: User) => {
    localStorage.setItem("hpa_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string, _role: UserRole) => {
      const data = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("hpa_token", data.token);
      persist(data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (data: { name: string; email: string; password: string; role: UserRole; bloodGroup?: string; phone?: string; specialty?: string; license?: string; hospital?: string }) => {
      await api<{ message: string; email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    []
  );

  const requestOtp = useCallback(async (email: string) => {
    await api<{ message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    await api<{ message: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }, []);

  const resetPassword = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      await api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("hpa_user");
    localStorage.removeItem("hpa_token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, requestOtp, verifyOtp, resetPassword }),
    [user, loading, login, register, logout, requestOtp, verifyOtp, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
