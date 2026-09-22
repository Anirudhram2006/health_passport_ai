"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, Stethoscope, User, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const roles: { value: UserRole; label: string; desc: string; icon: any }[] = [
  { value: "patient", label: "Patient", desc: "Digital Health Passport & Records", icon: User },
  { value: "doctor", label: "Doctor", desc: "Clinical Console & Patient Queue", icon: Stethoscope },
  { value: "admin", label: "Admin", desc: "Platform Operations & Analytics", icon: Users },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const pw = String(form.get("password"));
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (pw !== form.get("confirm")) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await register({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: pw,
        role: "patient",
        bloodGroup: String(form.get("bloodGroup") || "A+"),
        phone: String(form.get("phone") || ""),
      } as any);
      router.push("/auth/otp?mode=verify&email=" + encodeURIComponent(String(form.get("email"))));
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register to create your personal digital Health Passport."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <Input name="name" placeholder="Aarav Sharma" required autoComplete="name" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address">
            <Input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
          </Field>
          <Field label="Phone number">
            <Input name="phone" placeholder="+91 98765 43210" autoComplete="tel" />
          </Field>
        </div>

        <Field label="Blood group">
          <Select name="bloodGroup" defaultValue="B+" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => ({ value: b, label: `${b} Rh` }))} />
        </Field>

        {/* Password fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="Min 8 characters"
                required
                autoComplete="new-password"
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
          <Field label="Confirm password">
            <Input type="password" name="confirm" placeholder="Re-enter password" required autoComplete="new-password" />
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-500 dark:text-slate-400">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
          I agree to the{" "}
          <Link href="#" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Privacy Policy
          </Link>
        </label>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          <UserPlus className="h-4 w-4" />
          Create Health Passport
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Secured with 256-bit encryption &amp; JWT authentication
      </div>
    </AuthShell>
  );
}
