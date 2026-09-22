"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

export function CTA() {
  return (
    <section className="relative px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 via-teal-600 to-emerald-500 px-8 py-16 text-center shadow-glow md:px-16">
            <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />

            <div className="relative">
              <span className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                <Sparkles className="h-7 w-7 text-white" />
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Your digital health identity, ready in minutes
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Join 25,000+ patients who carry their complete medical history in one secure, AI-powered passport.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-brand-700 shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
                >
                  Create Health Passport
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-7 py-3.5 font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Sign in to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
