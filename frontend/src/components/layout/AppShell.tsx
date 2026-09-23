"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  BrainCircuit,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  QrCode,
  Siren,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export interface NavGroup {
  category: string;
  items: NavItem[];
}

interface AppShellProps {
  navItems: NavItem[];
  navGroups?: NavGroup[];
  accent: "brand" | "teal" | "violet";
  children: React.ReactNode;
}

export function AppShell({ navItems, navGroups, accent, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Group default nav items if navGroups is not explicitly supplied
  const effectiveGroups: NavGroup[] = navGroups || [
    {
      category: "OVERVIEW",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
      ]
    },
    {
      category: "MY HEALTH",
      items: [
        { href: "/dashboard/medications", label: "Medications", icon: Pill },
        { href: "/dashboard/reports", label: "Medical Reports", icon: FilePlus2 },
        { href: "/dashboard/summary", label: "Medical History & AI", icon: BrainCircuit, badge: "Clinical" },
      ]
    },
    {
      category: "EMERGENCY & PASSPORT",
      items: [
        { href: "/dashboard/emergency", label: "Health Passport & QR", icon: QrCode },
      ]
    }
  ];

  const SidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Dashboard navigation">
        {effectiveGroups.map((group) => (
          <div key={group.category} className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.category}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150",
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-600 dark:bg-brand-400" />}
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", active ? "bg-brand-200/80 text-brand-900 dark:bg-brand-900 dark:text-brand-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <Avatar name={user?.name ?? "User"} src={user?.avatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name || "Patient Account"}</p>
            <p className="truncate text-xs capitalize text-slate-400">{user?.role || "Patient"}</p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 lg:pb-0">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-xl"
          >
            <button
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </motion.aside>
        </div>
      )}

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="relative max-w-sm">
                <input
                  className="input-base !py-2 pl-9 text-xs"
                  placeholder="Search medications, reports, records…"
                  aria-label="Global search"
                />
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <ThemeToggle />
            <button className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            pathname === "/dashboard" ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/dashboard/medications"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            pathname === "/dashboard/medications" ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <Pill className="h-4 w-4" />
          <span>Meds</span>
        </Link>
        <Link
          href="/dashboard/reports"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            pathname === "/dashboard/reports" ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <FilePlus2 className="h-4 w-4" />
          <span>Reports</span>
        </Link>
        <Link
          href="/dashboard/emergency"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            pathname === "/dashboard/emergency" ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <QrCode className="h-4 w-4" />
          <span>Passport</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu className="h-4 w-4" />
          <span>More</span>
        </button>
      </div>
    </div>
  );
}

export const patientNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/medications", label: "Medications", icon: Pill },
  { href: "/dashboard/reports", label: "Medical Reports", icon: FilePlus2 },
  { href: "/dashboard/summary", label: "Medical History & AI", icon: BrainCircuit, badge: "Clinical" },
  { href: "/dashboard/emergency", label: "Health Passport & QR", icon: QrCode },
];
