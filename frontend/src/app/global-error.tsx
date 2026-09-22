"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">System Error</h1>
          <p className="text-sm text-slate-400">
            {error?.message || "Application encountered an error."}
          </p>
          <button
            onClick={() => reset()}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
