"use client";

import { QRCodeSVG } from "qrcode.react";
import type { PatientProfile } from "@/types";

export function buildPassportUrl(patient?: PatientProfile | null, token?: string | null): string {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  const tokenOrId = token || patient?.passportId || patient?.id || "HPA-2026-DEMO";
  return `${baseUrl}/passport/${tokenOrId}`;
}

export function QRPassport({
  patient,
  token,
  url,
  status = "active",
  size = 180,
  withFrame = true,
}: {
  patient?: PatientProfile | null;
  token?: string;
  url?: string;
  status?: "active" | "revoked" | "expired" | string;
  size?: number;
  withFrame?: boolean;
}) {
  const passportUrl = url || buildPassportUrl(patient, token);

  const isRevoked = status === "revoked";
  const isExpired = status === "expired";

  if (!withFrame) {
    return <QRCodeSVG value={passportUrl} size={size} level="H" marginSize={1} bgColor="#ffffff" fgColor={isRevoked ? "#991b1b" : "#0b476e"} />;
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`relative inline-flex items-center justify-center rounded-3xl bg-white p-4 ring-1 shadow-md ${
        isRevoked ? "ring-rose-300" : isExpired ? "ring-amber-300" : "ring-slate-200"
      }`}>
        <div className={`absolute inset-3 rounded-2xl border-2 border-dashed ${
          isRevoked ? "border-rose-300 bg-rose-50/40" : isExpired ? "border-amber-300 bg-amber-50/40" : "border-brand-200"
        }`} />
        
        <div className="relative">
          <QRCodeSVG
            value={passportUrl}
            size={size}
            level="H"
            marginSize={0}
            bgColor="#ffffff"
            fgColor={isRevoked ? "#dc2626" : isExpired ? "#d97706" : "#0b476e"}
          />
          {isRevoked && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center text-center p-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 bg-rose-100 px-2 py-1 rounded border border-rose-300">
                REVOKED
              </span>
            </div>
          )}
          {isExpired && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center text-center p-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-1 rounded border border-amber-300">
                EXPIRED
              </span>
            </div>
          )}
        </div>

        <span className={`pointer-events-none absolute bottom-1.5 right-3 text-[9px] font-bold uppercase tracking-widest ${
          isRevoked ? "text-rose-600" : isExpired ? "text-amber-600" : "text-brand-600"
        }`}>
          HPA·VERIFIED 2.0
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">
        {isRevoked ? "Passport Revoked" : isExpired ? "Passport Expired" : "Scan to Open Health Passport"}
      </p>
    </div>
  );
}
