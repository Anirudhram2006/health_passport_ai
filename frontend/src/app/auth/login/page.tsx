"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, "patient");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to access your health passport.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email address">
          <Input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-500 dark:text-slate-400">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
            Remember me
          </label>
          <Link href="/auth/forgot-password" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Forgot password?
          </Link>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </form>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
        New to Health Passport AI?{" "}
        <Link href="/auth/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Create an account
        </Link>
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Secured with 256-bit encryption &amp; JWT authentication
      </div>
    </AuthShell>
  );
}
