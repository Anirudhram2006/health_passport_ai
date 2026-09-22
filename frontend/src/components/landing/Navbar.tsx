"use client";

import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashPath = user ? `/${user.role === "admin" ? "admin" : user.role === "doctor" ? "doctor" : "dashboard"}` : "/auth/login";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled ? "glass mx-3 mt-3 rounded-3xl md:mx-6" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8" aria-label="Main navigation">
        <Link href="/" aria-label="Health Passport AI home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="btn-ghost">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {user ? (
            <Link href={dashPath} className="btn-primary !px-5 !py-2.5 text-sm">
              <ShieldCheck className="h-4 w-4" />
              My Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/auth/register" className="btn-primary !px-5 !py-2.5 text-sm">
                Create Health Passport
              </Link>
            </>
          )}
          <button
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <ul className="space-y-1 px-5 pb-5">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="btn-ghost w-full justify-start">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-ghost w-full justify-start">
                  Sign in
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
