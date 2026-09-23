"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  History,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useDoctorAuth } from "@/lib/doctor-auth-context";
import { api } from "@/lib/api";

export default function DoctorDashboardPage() {
  const { doctorUser } = useDoctorAuth();
  const [accessHistory, setAccessHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("hpa_doctor_token") : null;
    if (!token) {
      setLoadingHistory(false);
      return;
    }

    api<{ status: string; history: any[] }>("/doctor/access-history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (isMounted && res.status === "SUCCESS") {
          setAccessHistory(res.history || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isVerified = doctorUser?.verification?.status === "VERIFIED";

  return (
    <DoctorShell>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Good morning, {doctorUser?.name || "Dr. Medical Practitioner"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Verified Medical Practice &amp; Emergency Patient Health Passport Access
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/doctor/scan"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
            >
              <QrCode className="h-4 w-4" />
              Scan Patient QR
            </Link>
            <Link
              href="/doctor/history"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <History className="h-4 w-4 text-sky-400" />
              Access History
            </Link>
          </div>
        </div>

        {/* Verification Status Warning if Pending/Rejected */}
        {!isVerified && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">Verification Pending with State Medical Council</strong>
              Your account registration is under verification. Patient emergency QR scans remain disabled until your medical registration number is verified with official records.
            </div>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>NMC Council Status</span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-white flex items-center gap-2">
              {isVerified ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Verified Practitioner</span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-amber-400" />
                  <span>Pending Verification</span>
                </>
              )}
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              Reg: {doctorUser?.doctorProfile?.registrationNumber || "169421"} ({doctorUser?.doctorProfile?.registrationAuthority || "Tamil Nadu Medical Council"})
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Patient Records Scanned</span>
              <QrCode className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-white">{accessHistory.length}</p>
            <p className="text-[11px] text-slate-400">Verified QR Scan Executions</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Permitted Access Tier</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-400">Tier 1 Emergency Summary</p>
            <p className="text-[11px] text-slate-400">Allergies, Blood Group &amp; Clinical Summary</p>
          </div>
        </div>

        {/* Recent Patient Access Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-400" /> Recent Patient Access Activity
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Audit log of patient QR scans performed under your doctor session.</p>
            </div>
            <Link href="/doctor/history" className="text-xs font-bold text-sky-400 hover:underline">
              View All Log Entries &rarr;
            </Link>
          </div>

          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Loading recent access audit log…
            </div>
          ) : accessHistory.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {accessHistory.slice(0, 5).map((log, index) => (
                <div key={index} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{log.action}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-IN")} · IP: {log.ip || "127.0.0.1"}
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] px-2.5 py-1 rounded-md border border-emerald-500/20">
                    TIER 1 GRANTED
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-500 space-y-3">
              <QrCode className="h-8 w-8 mx-auto text-slate-600" />
              <p>No patient QR scans performed yet in this session.</p>
              <Link
                href="/doctor/scan"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:underline"
              >
                Scan a Patient QR Code Now &rarr;
              </Link>
            </div>
          )}
        </div>

      </div>
    </DoctorShell>
  );
}
