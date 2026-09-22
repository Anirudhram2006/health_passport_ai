"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Droplets,
  HeartPulse,
  Phone,
  Printer,
  ShieldAlert,
  ShieldCheck,
  User,
  Ban,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { downloadPatientSummaryPDF } from "@/lib/pdf";

interface Tier1PassportDTO {
  token: string;
  passportId: string;
  status: "active" | "revoked" | "expired" | string;
  scannedAt: string;
  accessTier: string;
  issuedAt?: string;
  expiresAt?: string;
  patient: {
    name: string;
    bloodGroup: string;
  };
  allergies: Array<{ substance: string; severity: string; reaction: string }>;
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
  triage?: {
    level: "RED" | "YELLOW" | "GREEN";
    badgeLabel: string;
    reasons: string[];
  };
}

export default function PublicHealthPassportPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [passport, setPassport] = useState<Tier1PassportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusState, setStatusState] = useState<"SUCCESS" | "NOT_FOUND" | "REVOKED" | "EXPIRED" | "ERROR">("SUCCESS");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setLoading(true);

    api<{ status: string; passport: Tier1PassportDTO; message?: string }>(`/patients/passport/${token}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.status === "SUCCESS" && res.passport) {
          setPassport(res.passport);
          setStatusState("SUCCESS");
        } else {
          setStatusState((res.status as any) || "ERROR");
          setErrorMessage(res.message || "Unable to verify Health Passport.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Unable to verify Health Passport. Please try again.";
        const lowerMsg = msg.toLowerCase();

        if (lowerMsg.includes("410") || lowerMsg.includes("revoked")) {
          setStatusState("REVOKED");
          setErrorMessage("This Health Passport has been revoked.");
        } else if (lowerMsg.includes("expired")) {
          setStatusState("EXPIRED");
          setErrorMessage("Health Passport expired.");
        } else if (lowerMsg.includes("404") || lowerMsg.includes("not found")) {
          setStatusState("NOT_FOUND");
          setErrorMessage("Health Passport not found.");
        } else {
          setStatusState("ERROR");
          setErrorMessage("Unable to verify Health Passport. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const copyPassportUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const printPassport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    if (!passport) return;
    const patientProfile: any = {
      id: passport.passportId,
      name: passport.patient.name,
      bloodGroup: passport.patient.bloodGroup,
      allergies: passport.allergies || [],
      emergencyContacts: passport.emergencyContacts || [],
    };
    downloadPatientSummaryPDF(patientProfile, [], [], []);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 py-12 px-4 text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-pulse">
          <div className="h-8 bg-slate-800 rounded-lg w-3/4 mx-auto" />
          <div className="h-4 bg-slate-800 rounded-lg w-1/2 mx-auto" />
          <div className="border-t border-slate-800 my-4" />
          <div className="space-y-4">
            <div className="h-16 bg-slate-800/60 rounded-xl" />
            <div className="h-24 bg-slate-800/60 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  // INVALID STATES HANDLING
  if (statusState !== "SUCCESS" || !passport) {
    return (
      <main className="min-h-screen bg-slate-950 py-12 px-4 text-white flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-2">
            {statusState === "REVOKED" ? <Ban className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
          </div>
          <h1 className="text-lg font-bold text-white">
            {statusState === "NOT_FOUND"
              ? "Health Passport not found"
              : statusState === "REVOKED"
              ? "This Health Passport has been revoked."
              : statusState === "EXPIRED"
              ? "Health Passport expired"
              : "Unable to verify Health Passport"}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {errorMessage || "Unable to verify Health Passport. Please try again."}
          </p>

          <Link
            href="/emergency"
            className="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to QR Scanner Portal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 text-slate-900 print:bg-white print:py-0 print:px-0">
      {/* Action Bar */}
      <div className="mx-auto max-w-2xl mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/emergency" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Scanner Portal
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={copyPassportUrl}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <Copy className="h-3.5 w-3.5 text-emerald-400" />
            {copied ? "Copied Link!" : "Copy Link"}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            Download PDF
          </button>
          <button
            onClick={printPassport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Record
          </button>
        </div>
      </div>

      {/* Clinical Triage Alert */}
      {passport.triage && passport.triage.level !== "GREEN" && (
        <div className="mx-auto max-w-2xl mb-4 print:hidden">
          <div
            className={`rounded-xl p-4 text-center font-bold tracking-wide uppercase text-white border ${
              passport.triage.level === "RED"
                ? "bg-rose-600/90 border-rose-400 shadow-md"
                : "bg-amber-600/90 border-amber-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              <ShieldAlert className="h-4 w-4" />
              EMERGENCY CLINICAL ALERT: {passport.triage.badgeLabel}
            </div>
            {passport.triage.reasons?.length > 0 && (
              <p className="mt-1 text-xs font-normal text-white/90 normal-case">
                {passport.triage.reasons[0]}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tier 1 Passport Card */}
      <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Document Header */}
        <div className="bg-slate-900 px-6 py-5 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                HP
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">HEALTH PASSPORT</h1>
                <p className="text-xs text-emerald-400 font-medium">Emergency Tier 1 Information</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED PASSPORT
              </span>
              <p className="text-[11px] font-mono text-slate-400 mt-1">Ref ID: {passport.passportId}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800">

          {/* Patient Core Summary */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4 text-emerald-600" /> Patient Emergency Overview
            </h2>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-medium">Patient Name</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{passport.patient.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-medium">Blood Group</p>
                <p className="text-base font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                  <Droplets className="h-4 w-4" /> {passport.patient.bloodGroup || "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Known Allergies */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Allergies &amp; Severe Reactions
            </h2>
            {passport.allergies?.length > 0 ? (
              <div className="space-y-2">
                {passport.allergies.map((a, i) => (
                  <div key={i} className="bg-rose-50/70 border border-rose-200 p-3 rounded-xl text-xs flex items-start justify-between">
                    <div>
                      <p className="font-bold text-rose-950">{a.substance}</p>
                      <p className="text-rose-800 mt-0.5 text-[11px]">{a.reaction}</p>
                    </div>
                    <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-md uppercase shrink-0">
                      {a.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No known allergies recorded.</p>
            )}
          </div>

          {/* Emergency Contacts */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-emerald-600" /> Emergency Contacts
            </h2>
            {passport.emergencyContacts?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {passport.emergencyContacts.map((c, i) => (
                  <div key={i} className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{c.name} <span className="font-normal text-slate-500">({c.relation})</span></p>
                      <p className="text-emerald-700 font-semibold mt-0.5">{c.phone}</p>
                    </div>
                    {c.phone && c.phone !== "Not recorded" && (
                      <a
                        href={`tel:${c.phone}`}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors print:hidden"
                        aria-label={`Call ${c.name}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No emergency contacts recorded.</p>
            )}
          </div>

          {/* Data Scope Notice */}
          <div className="rounded-xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500 border border-slate-200 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Limited Emergency Access (Tier 1):</strong> Full medical history, active prescriptions, lab reports, and AI clinical summaries are withheld on anonymous QR scans to protect patient privacy.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500 space-y-1">
          <p className="font-medium">Health Passport AI · Emergency Tier 1 Record</p>
          <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" /> Scanned at {new Date(passport.scannedAt).toLocaleTimeString("en-IN")}
          </p>
        </div>

      </div>
    </main>
  );
}
