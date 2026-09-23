"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  QrCode,
  ShieldAlert,
  Stethoscope,
  User,
  AlertTriangle,
} from "lucide-react";
import { useDoctorAuth } from "@/lib/doctor-auth-context";

interface DoctorShellProps {
  children: React.ReactNode;
}

export function DoctorShell({ children }: DoctorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { doctorUser, doctorLogout } = useDoctorAuth();

  const isVerified = doctorUser?.verification?.status === "VERIFIED";
  const isPending = doctorUser?.verification?.status === "PENDING";

  const handleLogout = () => {
    doctorLogout();
    router.push("/doctor/login");
  };

  const navItems = [
    { href: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctor/scan", label: "Scan Patient QR", icon: QrCode },
    { href: "/doctor/history", label: "Access History", icon: History },
    { href: "/doctor/profile", label: "Doctor Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between">
        <div>
          {/* Header Branding */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link href="/doctor/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-white tracking-tight">Doctor Portal</span>
                <p className="text-[10px] text-sky-400 font-medium">Health Passport AI</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-sky-600/20 text-sky-400 border border-sky-500/30"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-sky-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Doctor Profile Card */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">
                {doctorUser?.name || "Dr. Medical Practitioner"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Reg: {doctorUser?.doctorProfile?.registrationNumber || "NMC Verified"}
              </p>
            </div>
            {isVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : isPending ? (
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-400">Clinical Verification System</span>
          </div>

          <div>
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Registration Verified
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-semibold text-amber-400">
                <Clock className="h-3.5 w-3.5" /> Verification Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full text-[11px] font-semibold text-rose-400">
                <ShieldAlert className="h-3.5 w-3.5" /> Verification Failed
              </span>
            )}
          </div>
        </header>

        {/* Page Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
