"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 py-16 px-4 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/20 text-rose-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Something Went Wrong</h1>
        <p className="text-sm text-slate-400">
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
