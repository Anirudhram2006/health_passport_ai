"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, HeartPulse, ShieldCheck, Stethoscope, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const highlights = [
  { icon: ShieldCheck, text: "Encrypted & role-based patient records" },
  { icon: Activity, text: "Instant emergency QR access for first responders" },
  { icon: Stethoscope, text: "AI-assisted prescription & report analysis" },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-slate-50 dark:bg-slate-950 lg:grid-cols-2">
      <div className="hidden overflow-hidden relative lg:block border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              Secure digital health identity for <span className="text-brand-600 dark:text-brand-400">modern patient care.</span>
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Access your medical history, active prescriptions, lab reports, and emergency health passport anytime.
            </p>

            <div className="mt-8 space-y-3">
              {highlights.map((h) => (
                <div key={h.text} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    <h.icon className="h-4 w-4" />
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{h.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> HIPAA-compliant architecture
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-5 py-8 md:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden" aria-label="Home">
            <Logo size="sm" />
          </Link>
          <ThemeToggle className="ml-auto" />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
