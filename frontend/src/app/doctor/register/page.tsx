"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ShieldAlert, Stethoscope, UserCheck } from "lucide-react";
import { useState } from "react";
import { useDoctorAuth } from "@/lib/doctor-auth-context";

export default function DoctorRegisterPage() {
  const { doctorRegister, verifyRegistrationNumber } = useDoctorAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationAuthority, setRegistrationAuthority] = useState("Tamil Nadu Medical Council");
  const [qualification, setQualification] = useState("MBBS");
  const [specialization, setSpecialization] = useState("General Medicine");
  const [hospital, setHospital] = useState("");
  const [city, setCity] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");

  const [verifyingReg, setVerifyingReg] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckRegistration = async () => {
    if (!registrationNumber.trim()) {
      setError("Please enter a medical registration number to verify.");
      return;
    }
    setError("");
    setVerifyingReg(true);
    try {
      const res = await verifyRegistrationNumber(registrationNumber.trim());
      if (res.status === "SUCCESS" && res.verification) {
        setVerificationResult(res.verification);
        if (res.verification.details?.qualification) {
          setQualification(res.verification.details.qualification);
        }
        if (res.verification.details?.city) {
          setCity(res.verification.details.city);
        }
        if (res.verification.registeredName && !name) {
          setName(res.verification.registeredName);
        }
      } else {
        setVerificationResult({ verified: false, status: "REJECTED", message: res.message });
      }
    } catch (err: any) {
      setVerificationResult({ verified: false, status: "UNAVAILABLE", message: "Verification check failed." });
    } finally {
      setVerifyingReg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const formData = {
        name,
        email,
        phone,
        password,
        registrationNumber,
        registrationAuthority,
        qualification,
        specialization,
        hospital,
        city,
        state,
      };

      const res = await doctorRegister(formData);
      if (res.status === "SUCCESS") {
        router.push("/doctor/dashboard");
      } else {
        setError(res.message || "Doctor registration failed.");
      }
    } catch (err: any) {
      setError(err?.message || "Doctor registration failed. Please check registration number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Doctor Account Registration</h1>
          <p className="text-xs text-slate-400">
            Mandatory registration verification against official Medical Council records.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section 1: Registration Verification */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-sky-400 uppercase tracking-wider">
              1. Medical Registration Verification
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Medical Reg No (e.g. 169421 or 90253)"
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={handleCheckRegistration}
                disabled={verifyingReg}
                className="py-2.5 px-4 rounded-xl bg-sky-600/30 border border-sky-500/40 font-bold text-xs text-sky-300 hover:bg-sky-600 hover:text-white transition-colors"
              >
                {verifyingReg ? "Verifying…" : "Verify Reg No"}
              </button>
            </div>

            {/* Verification Result Badge */}
            {verificationResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                verificationResult.status === "VERIFIED"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : verificationResult.status === "PENDING"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}>
                <div className="flex items-center gap-2">
                  {verificationResult.status === "VERIFIED" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : verificationResult.status === "PENDING" ? (
                    <Clock className="h-4 w-4 text-amber-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="font-bold">
                    Status: {verificationResult.status} {verificationResult.registeredName ? `(${verificationResult.registeredName})` : ""}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{verificationResult.source}</span>
              </div>
            )}
          </div>

          {/* Section 2: Personal & Professional Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Doctor Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Kamali V"
                required
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.kamali@tnmc.org.in"
                required
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94440 12821"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">State Medical Council</label>
              <select
                value={registrationAuthority}
                onChange={(e) => setRegistrationAuthority(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Tamil Nadu Medical Council">Tamil Nadu Medical Council</option>
                <option value="National Medical Commission">National Medical Commission (NMC)</option>
                <option value="Karnataka Medical Council">Karnataka Medical Council</option>
                <option value="Maharashtra Medical Council">Maharashtra Medical Council</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Qualification</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="MBBS / MD / MS"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="General Medicine / Cardiology / Nephrology"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hospital / Clinic Practice</label>
              <input
                type="text"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="Rajiv Gandhi Govt Hospital / Apollo Hospital"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City / State</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chennai / Salem / Coimbatore"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-sky-600 font-bold text-xs text-white hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" />
            {loading ? "Registering & Verifying Account…" : "Register Doctor Account"}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Already have a doctor account?{" "}
            <Link href="/doctor/login" className="font-bold text-sky-400 hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
