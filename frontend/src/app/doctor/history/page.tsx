"use client";

import { useEffect, useState } from "react";
import { Clock, FileText, History, QrCode, ShieldCheck } from "lucide-react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { api } from "@/lib/api";

export default function DoctorHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("hpa_doctor_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    api<{ status: string; history: any[] }>("/doctor/access-history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (isMounted && res.status === "SUCCESS") {
          setHistory(res.history || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DoctorShell>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <History className="h-6 w-6 text-sky-400" /> Patient Access Audit History
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Complete audit trail of patient QR codes scanned and accessed under your doctor session.
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-800 pb-3">
            <span>Audit Action &amp; Timestamp</span>
            <span>Permitted Access Scope</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
              Loading patient access history log…
            </div>
          ) : history.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {history.map((log, index) => (
                <div key={index} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{log.action}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        <Clock className="h-3 w-3 inline mr-1 text-slate-500" />
                        {new Date(log.createdAt).toLocaleString("en-IN")} · IP Address: {log.ip || "127.0.0.1"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-2.5 py-1 rounded-md">
                      <ShieldCheck className="h-3 w-3" /> TIER 1 GRANTED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <QrCode className="h-8 w-8 mx-auto text-slate-600" />
              <p>No patient QR scans recorded yet in your access history.</p>
            </div>
          )}
        </div>

      </div>
    </DoctorShell>
  );
}
