"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Phone,
  Printer,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { QRScanner, parsePassportTokenFromScannedText } from "@/components/qr/QRScanner";
import { api } from "@/lib/api";
import { downloadPatientSummaryPDF } from "@/lib/pdf";

export default function DoctorScanPage() {
  const [scanStatus, setScanStatus] = useState<
    "WAITING" | "SCANNING" | "VALIDATING" | "PATIENT_IDENTIFIED" | "ACCESS_GRANTED" | "ERROR"
  >("WAITING");

  const [errorMessage, setErrorMessage] = useState("");
  const [patientPassport, setPatientPassport] = useState<any>(null);
  const [manualInput, setManualInput] = useState("");

  const handleScanToken = async (scannedRaw: string) => {
    const token = parsePassportTokenFromScannedText(scannedRaw) || scannedRaw.trim();
    if (!token) {
      setScanStatus("ERROR");
      setErrorMessage("Invalid Health Passport QR code structure.");
      return;
    }

    setScanStatus("VALIDATING");
    setErrorMessage("");

    try {
      const doctorToken = typeof window !== "undefined" ? localStorage.getItem("hpa_doctor_token") : null;
      const res = await api<{ status: string; passport: any; message?: string }>("/doctor/scan-qr", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: doctorToken ? { Authorization: `Bearer ${doctorToken}` } : {},
      });

      if (res.status === "SUCCESS" && res.passport) {
        setScanStatus("ACCESS_GRANTED");
        setPatientPassport(res.passport);
      } else {
        setScanStatus("ERROR");
        setErrorMessage(res.message || "Unable to authorize patient record scan.");
      }
    } catch (err: any) {
      setScanStatus("ERROR");
      const msg = err?.message || "QR scan authorization failed.";
      if (msg.toLowerCase().includes("revoked")) {
        setErrorMessage("This Health Passport has been revoked.");
      } else if (msg.toLowerCase().includes("expired")) {
        setErrorMessage("Health Passport expired.");
      } else if (msg.toLowerCase().includes("unverified")) {
        setErrorMessage("Your doctor account verification is pending. Access to patient records is disabled.");
      } else {
        setErrorMessage(msg);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScanToken(manualInput);
    }
  };

  const handleDownloadPDF = () => {
    if (!patientPassport) return;
    const patientProfile: any = {
      id: patientPassport.passportId,
      name: patientPassport.patient.name,
      bloodGroup: patientPassport.patient.bloodGroup,
      allergies: patientPassport.allergies || [],
      emergencyContacts: patientPassport.emergencyContacts || [],
    };
    const insights = patientPassport.emergencySummary
      ? [
          {
            id: "emergency",
            icon: "alert",
            title: "Emergency Medical Summary",
            detail: patientPassport.emergencySummary,
            tone: "warning" as const,
          },
        ]
      : [];
    downloadPatientSummaryPDF(patientProfile, [], [], insights);
  };

  return (
    <DoctorShell>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <QrCode className="h-6 w-6 text-sky-400" /> Scan Patient Health Passport QR
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Verified doctor QR scanning with server-side signature validation and Tier 1 emergency access.
            </p>
          </div>
          {patientPassport && (
            <button
              onClick={() => {
                setPatientPassport(null);
                setScanStatus("WAITING");
              }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl"
            >
              Scan Another QR
            </button>
          )}
        </div>

        {/* Status Indicator Banner */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full animate-ping ${
              scanStatus === "ACCESS_GRANTED"
                ? "bg-emerald-400"
                : scanStatus === "ERROR"
                ? "bg-rose-400"
                : "bg-sky-400"
            }`} />
            <span className="text-xs font-bold text-slate-300">
              Status:{" "}
              {scanStatus === "WAITING"
                ? "Waiting for QR Code..."
                : scanStatus === "VALIDATING"
                ? "Validating QR Signature & Doctor Authorization..."
                : scanStatus === "ACCESS_GRANTED"
                ? "Patient Identified — Access Granted"
                : "Scan Authorization Failed"}
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Audit Level: Verified Doctor Logged
          </span>
        </div>

        {/* Scanner Card */}
        {!patientPassport && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-300">Position Patient QR inside Camera Frame</p>
                <p className="text-[11px] text-slate-500">Supports printed QR codes, mobile screens, or image upload</p>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3">
                <QRScanner
                  onResult={(decodedText, token) => handleScanToken(token || decodedText)}
                  onError={(err) => {
                    setScanStatus("ERROR");
                    setErrorMessage(err);
                  }}
                />
              </div>

              {scanStatus === "ERROR" && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  {errorMessage || "Invalid or unauthorized QR code."}
                </div>
              )}
            </div>

            {/* Manual Lookup Option */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 h-fit">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Manual Passport Lookup</h3>
                <p className="text-[11px] text-slate-400 mt-1">Enter Passport ID or Token manually if camera is unavailable.</p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Passport ID (e.g. HPA-2026-DEMO or hpa_tok_...)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 font-bold text-xs py-2.5 rounded-xl text-white transition-colors"
                >
                  Verify &amp; Read Passport
                </button>
              </form>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-400">Security Rule:</p>
                <p>QR payload contains no raw patient medical data. Authorization is checked on server.</p>
              </div>
            </div>
          </div>
        )}

        {/* Patient Access Card (Rendered upon successful scan) */}
        {patientPassport && (
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden space-y-6 p-6 sm:p-8">
            {/* Header */}
            <div className="bg-slate-900 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 p-6 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  HP
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">PATIENT EMERGENCY HEALTH PASSPORT</h2>
                  <p className="text-xs text-emerald-400 font-semibold">Tier 1 Verified Emergency Access</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED AUTHORIZED
                </span>
                <p className="text-[11px] font-mono text-slate-400 mt-1">Ref ID: {patientPassport.passportId}</p>
              </div>
            </div>

            {/* Patient Core Summary */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-600" /> Patient Overview
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Patient Name</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{patientPassport.patient.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Blood Group</p>
                  <p className="text-base font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                    <Droplets className="h-4 w-4" /> {patientPassport.patient.bloodGroup || "Unspecified"}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Emergency Summary */}
            {patientPassport.emergencySummary && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> AI Emergency Medical Summary
                </h3>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-950 font-medium leading-relaxed">
                  {patientPassport.emergencySummary}
                </div>
              </div>
            )}

            {/* Known Allergies */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" /> Allergies &amp; Severe Reactions
              </h3>
              {patientPassport.allergies?.length > 0 ? (
                <div className="space-y-2">
                  {patientPassport.allergies.map((a: any, i: number) => (
                    <div key={i} className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs flex items-start justify-between">
                      <div>
                        <p className="font-bold text-rose-950">{a.substance}</p>
                        <p className="text-rose-800 text-[11px] mt-0.5">{a.reaction}</p>
                      </div>
                      <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No known severe allergies recorded.</p>
              )}
            </div>

            {/* Emergency Contacts */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-emerald-600" /> Emergency Contacts
              </h3>
              {patientPassport.emergencyContacts?.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {patientPassport.emergencyContacts.map((c: any, i: number) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{c.name} <span className="font-normal text-slate-500">({c.relation})</span></p>
                        <p className="text-emerald-700 font-semibold mt-0.5">{c.phone}</p>
                      </div>
                      <a href={`tel:${c.phone}`} className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No emergency contacts recorded.</p>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800"
              >
                <FileText className="h-4 w-4 text-sky-400" /> Download PDF Medical Record
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-500"
              >
                <Printer className="h-4 w-4" /> Print Record
              </button>
            </div>
          </div>
        )}

      </div>
    </DoctorShell>
  );
}
