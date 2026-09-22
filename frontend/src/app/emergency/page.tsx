"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Lock, Siren } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { QRScanner, parsePassportTokenFromScannedText } from "@/components/qr/QRScanner";
import { Logo } from "@/components/ui/Logo";

function EmergencyScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    setMounted(true);
    const rawParam = searchParams.get("passportId") || searchParams.get("token") || searchParams.get("id");
    if (rawParam) {
      const cleaned = rawParam.replace(/\+/g, " ").trim();
      const token = parsePassportTokenFromScannedText(cleaned) || cleaned.replace(/[^a-zA-Z0-9_\-]/g, "");
      if (token) {
        setRedirecting(true);
        router.push(`/passport/${encodeURIComponent(token)}`);
      }
    }
  }, [searchParams, router]);

  const handleResult = (_decodedText: string, token: string) => {
    if (!token) {
      setError("Invalid Health Passport QR code");
      return;
    }
    setRedirecting(true);
    setError(null);
    router.push(`/passport/${encodeURIComponent(token)}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = parsePassportTokenFromScannedText(manualInput) || manualInput.replace(/[^a-zA-Z0-9_\-]/g, "").trim();

    if (token) {
      setRedirecting(true);
      setError(null);
      router.push(`/passport/${encodeURIComponent(token)}`);
    } else {
      setError("Invalid Passport ID format.");
    }
  };

  return (
    <div className="relative mx-auto max-w-md px-4 pb-16 pt-6">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
          <Siren className="h-4 w-4 text-rose-400" />
          Emergency Scanner Portal
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Scan patient QR code for instant read-only access to emergency health record.</p>
      </div>

      <div className="mt-6">
        <div className="mb-4 text-center">
          <h1 className="text-lg font-bold text-white">Scan Patient Health Passport QR</h1>
          <p className="mt-0.5 text-xs text-slate-400">Position the QR code inside camera frame or upload image</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          {mounted ? (
            <QRScanner onResult={handleResult} onError={setError} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Initializing camera scanner…
            </div>
          )}
        </div>

        {redirecting && (
          <div className="mt-3 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl animate-pulse">
            Opening Patient Medical Passport…
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
        )}

        {/* Manual Lookup Form */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400">Lookup Passport by ID:</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter Passport ID (e.g. HPA-2026-0001)"
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="h-3.5 w-3.5 text-emerald-400" /> Read-only Emergency Verification
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyAccessPage() {
  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      <header className="relative flex items-center justify-between px-5 py-4 border-b border-slate-900">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <Logo size="sm" />
      </header>

      <Suspense fallback={
        <div className="py-20 text-center text-xs text-slate-500">Loading Scanner Portal...</div>
      }>
        <EmergencyScannerContent />
      </Suspense>
    </main>
  );
}
