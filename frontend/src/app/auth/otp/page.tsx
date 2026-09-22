"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function OTPContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") || "verify";
  const email = params.get("email") || "you@example.com";
  const { verifyOtp, resetPassword, requestOtp } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const resend = async () => {
    setTimer(60);
    await requestOtp(email);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "reset") {
        if (newPassword.length < 8) {
          setError("New password must be at least 8 characters.");
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        await resetPassword(email, code, newPassword);
        router.push("/auth/login");
      } else {
        await verifyOtp(email, code);
        router.push("/auth/login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="OTP Verification" subtitle={`Enter the 6-digit code sent to ${email}.`}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-center gap-2.5 sm:gap-3" role="group" aria-label="OTP input">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className={cn(
                "h-14 w-11 rounded-2xl border-2 border-slate-200 bg-white text-center text-2xl font-bold text-slate-900 shadow-sm outline-none transition-all sm:h-16 sm:w-14",
                "focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              )}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {mode === "reset" && (
          <div className="space-y-4">
            <Field label="New password" hint="Minimum 8 characters.">
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
        )}

        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          <ShieldCheck className="h-4 w-4" />
          {mode === "reset" ? "Verify & Reset Password" : "Verify & Continue"}
        </Button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          {timer > 0 ? (
            <span>
              Resend code in{" "}
              <span className="font-bold text-brand-600 dark:text-brand-400">
                00:{timer.toString().padStart(2, "0")}
              </span>
            </span>
          ) : (
            <button type="button" onClick={resend} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Resend OTP
            </button>
          )}
        </div>
      </form>

      <Link href="/auth/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><KeyRound className="h-8 w-8 animate-pulse text-brand-400" /></div>}>
      <OTPContent />
    </Suspense>
  );
}
