"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 py-16 px-4 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/20 text-amber-400">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">404 - Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested page or Health Passport record could not be found.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Home
        </Link>
      </div>
    </main>
  );
}
