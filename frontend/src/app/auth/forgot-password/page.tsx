"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, MailCheck } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const { requestOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await requestOtp(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll send a one-time OTP to your verified email.">
      {!sent ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Registered email" hint="An OTP will be sent to this address.">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-11"
            />
          </Field>
          <Button type="submit" loading={loading} size="lg" className="w-full">
            <MailCheck className="h-4 w-4" />
            Send OTP
          </Button>
        </form>
      ) : (
        <div className="glass-strong p-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <MailCheck className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">OTP sent!</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            A 6-digit code was sent to <span className="font-semibold">{email}</span>. Check your inbox.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => router.push(`/auth/otp?mode=reset&email=${encodeURIComponent(email)}`)}
          >
            <KeyRound className="h-4 w-4" />
            Enter OTP
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Remembered your password?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
