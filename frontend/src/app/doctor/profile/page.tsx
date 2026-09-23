"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { DoctorShell } from "@/components/layout/DoctorShell";
import { useDoctorAuth } from "@/lib/doctor-auth-context";

export default function DoctorProfilePage() {
  const { doctorUser } = useDoctorAuth();
  const profile = doctorUser?.doctorProfile;
  const verification = doctorUser?.verification;
  const isVerified = verification?.status === "VERIFIED";

  return (
    <DoctorShell>
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <UserCheck className="h-6 w-6 text-sky-400" /> Doctor Verified Profile
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Official Medical Council registration details and verification status.
            </p>
          </div>

          <div>
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Verified Doctor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-bold text-amber-400">
                <Clock className="h-4 w-4" /> Pending Verification
              </span>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          
          {/* Identity Header */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
            <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xl">
              <Stethoscope className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {doctorUser?.name || profile?.fullName || "Dr. Medical Practitioner"}
              </h2>
              <p className="text-xs text-sky-400 font-medium mt-0.5">
                {profile?.specialization || "General Medicine"} · {profile?.qualification || "MBBS"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-500" /> {profile?.hospital || "Medical Hospital"}, {profile?.city || "Chennai"}, {profile?.state || "Tamil Nadu"}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid sm:grid-cols-2 gap-5 text-xs">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">Medical Registration Number</p>
              <p className="text-sm font-bold text-white font-mono">{profile?.registrationNumber || "169421"}</p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">State Medical Council</p>
              <p className="text-sm font-bold text-white">{profile?.registrationAuthority || "Tamil Nadu Medical Council"}</p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">Primary Qualification</p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-sky-400" /> {profile?.qualification || "MBBS"}
              </p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">Specialization</p>
              <p className="text-sm font-bold text-white">{profile?.specialization || "General Medicine"}</p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">Hospital Practice</p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-sky-400" /> {profile?.hospital || "Medical Hospital"}
              </p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">Email Address</p>
              <p className="text-sm font-bold text-white">{doctorUser?.email || "dr.kamali@tnmc.org.in"}</p>
            </div>
          </div>

          {/* Verification Source Box */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Medical Council Verification Authority
              </span>
              <span className="text-emerald-400 font-bold uppercase">{verification?.status || "VERIFIED"}</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <p>• Verification Source: <span className="text-slate-200">{verification?.verificationSource || "Tamil Nadu Medical Council (Official NMC IMR Database)"}</span></p>
              <p>• Verification Date: <span className="text-slate-200">{verification?.verifiedAt ? new Date(verification.verifiedAt).toLocaleDateString("en-IN") : "09-09-2022"}</span></p>
              <p>• Reference ID: <span className="text-slate-200 font-mono">{verification?.verificationReference || "NMC-TNMC-169421"}</span></p>
            </div>
          </div>

        </div>

      </div>
    </DoctorShell>
  );
}
