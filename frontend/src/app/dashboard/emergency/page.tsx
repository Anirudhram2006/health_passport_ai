"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Download,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  Siren,
  Share2,
  Lock,
  Ban,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, patientNav } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QRPassport } from "@/components/qr/QRPassport";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadPatientSummaryPDF } from "@/lib/pdf";
import { usePatientHome, mapTimeline } from "@/lib/use-patient";
import { api } from "@/lib/api";

interface PassportInfo {
  token: string;
  passportId: string;
  status: "active" | "revoked" | "expired" | string;
  issuedAt?: string;
  expiresAt?: string;
  qr?: string;
  url?: string;
  scanCount?: number;
}

export default function HealthPassportManagementPage() {
  const { data, loading: homeLoading, refetch } = usePatientHome();
  const [passportInfo, setPassportInfo] = useState<PassportInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [shared, setShared] = useState(false);

  // Fetch authenticated patient's passport
  const loadPassport = async () => {
    setLoading(true);
    try {
      const res = await api<{ status: string; passport: PassportInfo }>("/patients/passport/me");
      if (res && res.passport) {
        setPassportInfo(res.passport);
      }
    } catch (err) {
      console.error("Failed to load passport info", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassport();
  }, []);

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      const res = await api<{ status: string; passport: PassportInfo }>("/patients/passport/generate", {
        method: "POST",
      });
      if (res && res.passport) {
        setPassportInfo(res.passport);
        setActionMessage("Health Passport generated successfully!");
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch (err) {
      console.error("Failed to generate passport", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerateOpen(false);
    setActionLoading(true);
    try {
      const res = await api<{ status: string; passport: PassportInfo; message?: string }>("/patients/passport/regenerate", {
        method: "POST",
      });
      if (res && res.passport) {
        setPassportInfo(res.passport);
        setActionMessage(res.message || "New QR code generated! Previous QR has been invalidated.");
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to regenerate passport", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    setRevokeOpen(false);
    setActionLoading(true);
    try {
      const res = await api<{ status: string; message?: string }>("/patients/passport/revoke", {
        method: "POST",
      });
      if (res) {
        setPassportInfo((prev) => (prev ? { ...prev, status: "revoked" } : null));
        setActionMessage(res.message || "Health Passport revoked.");
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to revoke passport", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    setShareOpen(false);
    const passportUrl = passportInfo?.url || (typeof window !== "undefined" ? `${window.location.origin}/passport/${passportInfo?.token || ""}` : "");
    if (navigator.share) {
      await navigator.share({
        title: `${data?.patient?.name || "Patient"} — Emergency Health Passport`,
        text: "Emergency medical health passport record",
        url: passportUrl,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(passportUrl);
    }
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  const downloadQR = () => {
    if (!passportInfo?.qr) return;
    const link = document.createElement("a");
    link.href = passportInfo.qr;
    link.download = `Health-Passport-QR-${passportInfo.passportId || "HPA"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (homeLoading || loading || !data) {
    return (
      <AppShell navItems={patientNav} accent="brand">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[380px] w-full rounded-2xl" />
            <Skeleton className="h-[380px] w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  const patient = data.patient;
  const timeline = mapTimeline(data.reports);
  const status = passportInfo?.status || "active";
  const isRevoked = status === "revoked";
  const isExpired = status === "expired";

  return (
    <AppShell navItems={patientNav} accent="brand">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Banner */}
        <div className="border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Secure QR Health Passport</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Cryptographically reference-backed scannable passport for emergency first responders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isRevoked
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                  : isExpired
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
              }`}>
                {isRevoked ? <Ban className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Passport Status: {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {actionMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {actionMessage}
          </div>
        )}

        {/* Emergency Context Banner */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-600 text-white mt-0.5">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">Privacy &amp; Security Architecture</h2>
              <p className="mt-1 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                This QR does not contain your medical records. It contains a secure reference used to retrieve authorized emergency information. No passwords, prescriptions, or full history are embedded in the QR image.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Display Card */}
          <Card className="flex flex-col items-center p-6 text-center border-slate-200/90 dark:border-slate-800">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Scannable QR Code</p>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs dark:bg-slate-800 dark:border-slate-700">
              <QRPassport
                patient={patient}
                token={passportInfo?.token}
                url={passportInfo?.url}
                status={status}
                size={210}
              />
            </div>

            <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 space-y-1">
              <p className="flex items-center justify-center gap-1">
                <Fingerprint className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                Signed Digital Reference Token
              </p>
              {passportInfo?.issuedAt && (
                <p className="text-[11px] text-slate-400">Issued: {new Date(passportInfo.issuedAt).toLocaleDateString("en-IN")}</p>
              )}
              {passportInfo?.expiresAt && (
                <p className="text-[11px] text-slate-400">Expires: {new Date(passportInfo.expiresAt).toLocaleDateString("en-IN")}</p>
              )}
            </div>

            {/* Passport Action Buttons */}
            <div className="mt-6 flex w-full flex-col gap-2.5">
              {!isRevoked ? (
                <div className="flex w-full gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => setRegenerateOpen(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-brand-600" />
                    Regenerate QR
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 text-xs"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => setRevokeOpen(true)}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Revoke Passport
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full text-xs"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleGenerate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate New Passport
                </Button>
              )}

              <div className="flex w-full gap-2">
                <Button variant="secondary" className="flex-1 text-xs" size="sm" onClick={downloadQR} disabled={isRevoked}>
                  <Download className="h-3.5 w-3.5" /> Download QR
                </Button>
                <Button variant="secondary" className="flex-1 text-xs" size="sm" onClick={() => downloadPatientSummaryPDF(patient, timeline, data.reports)}>
                  <Printer className="h-3.5 w-3.5" /> PDF Record
                </Button>
                <Button variant="secondary" className="px-3" size="sm" onClick={() => setShareOpen(true)} disabled={isRevoked}>
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {shared && (
              <p className="mt-2.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Passport record link copied / shared ✓
              </p>
            )}
          </Card>

          {/* Tier 1 Access Info Card */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Tier 1 Emergency Data Scope
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                When first responders scan your active QR, the backend validates the opaque reference token and exposes strictly Tier 1 emergency details:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {[
                  "Patient Name",
                  `Blood Group (${patient.bloodGroup || "Not specified"})`,
                  `Allergies (${patient.allergies?.length || 0} recorded)`,
                  `Emergency Contacts (${patient.emergencyContacts?.length || 0} contacts)`,
                  "Clinical Triage Priority Badge",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/50">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong>Strict Authorization Boundary:</strong> Full medical history, lab reports, AI summaries, and prescriptions are withheld in Tier 1. Authorized doctor verification (Module 11/12) is required for Tier 2 full record access.
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 pb-2.5 dark:border-slate-800">
                Emergency Profile Snapshot
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2.5 text-center">
                <div className="rounded-xl bg-rose-50/60 p-3 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Blood Group</p>
                  <p className="mt-0.5 text-lg font-bold text-rose-700 dark:text-rose-300">{patient.bloodGroup || "N/A"}</p>
                </div>
                <div className="rounded-xl bg-amber-50/60 p-3 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Allergies</p>
                  <p className="mt-0.5 text-lg font-bold text-amber-700 dark:text-amber-300">{patient.allergies?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-brand-50/60 p-3 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30">
                  <p className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">Emergency Contacts</p>
                  <p className="mt-0.5 text-lg font-bold text-brand-700 dark:text-brand-300">{patient.emergencyContacts?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/60 p-3 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Passport Access</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase">{status}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Modal open={regenerateOpen} onClose={() => setRegenerateOpen(false)} title="Regenerate Health Passport QR">
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Regenerating your Health Passport will invalidate the previous QR code immediately. Anyone scanning the old QR will no longer be able to access your emergency information.
          </p>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
            <strong>Warning:</strong> If you have printed or shared your existing QR code, you will need to replace it with the new QR.
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setRegenerateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleRegenerate} disabled={actionLoading}>
              <RefreshCw className="h-4 w-4" />
              Confirm Regenerate
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={revokeOpen} onClose={() => setRevokeOpen(false)} title="Revoke Health Passport">
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to revoke your Health Passport? Once revoked, scanning the QR will show a "Passport Access Revoked" warning and will withhold all emergency details.
          </p>
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
            You can generate a new Health Passport at any time in the future.
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setRevokeOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" className="flex-1" onClick={handleRevoke} disabled={actionLoading}>
              <Ban className="h-4 w-4" />
              Confirm Revoke
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share Health Passport Record">
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sharing provides emergency Tier 1 read-only access to your critical medical record. Only share with verified healthcare personnel.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleShare}>
              <ShieldCheck className="h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
