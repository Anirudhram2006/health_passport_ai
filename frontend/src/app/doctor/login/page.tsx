"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { useDoctorAuth } from "@/lib/doctor-auth-context";

export default function DoctorLoginPage() {
  const { doctorLogin } = useDoctorAuth();
  const router = useRouter();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await doctorLogin(loginId, password);
      router.push("/doctor/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or account not verified.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Doctor Portal Sign In</h1>
          <p className="text-xs text-slate-400">
            Access patient emergency records with Medical Council verification.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Registration Number or Email Address
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. 169421 or dr.kamali@tnmc.org.in"
              required
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-sky-600 font-bold text-xs text-white hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Authenticating Doctor Account…" : "Sign In to Doctor Dashboard"}
          </button>
        </form>


        {/* Footer */}
        <div className="text-center pt-2 space-y-3">
          <p className="text-xs text-slate-400">
            Don't have a verified doctor account?{" "}
            <Link href="/doctor/register" className="font-bold text-sky-400 hover:underline">
              Register as Doctor
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            NMC / Tamil Nadu Medical Council Verified Authentication
          </div>
        </div>

      </div>
    </main>
  );
}
