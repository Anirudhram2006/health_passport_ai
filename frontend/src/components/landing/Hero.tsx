"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowRight, QrCode, ScanLine, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/Motion";

function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden>
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-400/30 via-teal-300/20 to-mint/30 blur-3xl" />

      {/* Main passport card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 mx-auto w-[86%] p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Stethoscope className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Aarav Sharma</p>
              <p className="text-xs text-slate-400">Patient ID · P-100824</p>
            </div>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white p-1.5 ring-1 ring-slate-200">
            <svg viewBox="0 0 24 24" className="h-full w-full text-slate-800">
              <rect width="24" height="24" fill="none" />
              <path fill="#0b476e" d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z" />
            </svg>
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Blood Group</p>
            <p className="mt-0.5 text-lg font-extrabold text-rose-500">B+</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Health Score</p>
            <p className="mt-0.5 text-lg font-extrabold text-gradient">82 / 100</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-gradient-soft px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            <span className="font-bold">AI Insight:</span> HbA1c improved to 6.9% — glycemic control is on track.
          </p>
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute -right-1 top-8 animate-float z-20"
      >
        <div className="glass-strong flex items-center gap-3 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-white">Blood Pressure</p>
            <p className="text-[11px] text-slate-400">128 / 84 mmHg · Normal</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.55 }}
        className="absolute -left-2 bottom-24 animate-float-slow z-20"
      >
        <div className="glass-strong flex items-center gap-3 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <ScanLine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-white">OCR Report</p>
            <p className="text-[11px] text-slate-400">6 reports digitized</p>
          </div>
        </div>
      </motion.div>

      {/* Rotating orbit icons */}
      <div className="absolute left-1/2 top-1/2 z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-[ai-orbit_20s_linear_infinite]">
        <span className="absolute -top-2 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full bg-white text-brand-500 shadow-glass dark:bg-slate-800">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </div>
      <div className="absolute left-1/2 top-1/2 z-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 animate-[ai-orbit_26s_linear_infinite_reverse]">
        <span className="absolute -bottom-1 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full bg-white text-teal-500 shadow-glass dark:bg-slate-800">
          <QrCode className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient pb-20 pt-32 dark:bg-hero-gradient-dark md:pt-40">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" aria-hidden />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 md:px-8 lg:grid-cols-2">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="chip">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              AI-Powered · HIPAA Aware · JWT Secured
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white md:text-6xl"
          >
            Your Medical History, <span className="text-gradient">Anytime, Anywhere.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300"
          >
            Health Passport AI turns scattered paper reports into one intelligent, scannable health identity — with AI summaries, OCR digitization, and instant emergency access.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/auth/register" className="btn-primary">
              Create Health Passport
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              <QrCode className="h-4 w-4" />
              View Dashboard
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 grid max-w-md grid-cols-3 gap-4"
          >
            {[
              { value: <AnimatedCounter to={25} suffix="k+" />, label: "Passports issued" },
              { value: <AnimatedCounter to={180} suffix="k+" />, label: "Records digitized" },
              { value: <AnimatedCounter to={120} suffix="+" />, label: "Partner hospitals" },
            ].map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl font-extrabold text-gradient sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}
