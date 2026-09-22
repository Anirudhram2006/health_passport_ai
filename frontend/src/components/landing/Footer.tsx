import Link from "next/link";
import { Github, Heart, Linkedin, Mail, Twitter } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Product",
    links: ["AI Medical Summary", "QR Passport", "OCR Scanner", "Emergency Access", "Pricing"],
  },
  {
    title: "For Patients",
    links: ["Create Passport", "Upload Reports", "View Summary", "Appointments", "Download PDF"],
  },
  {
    title: "For Doctors",
    links: ["Doctor Login", "Patient Search", "Prescriptions", "Lab Reports", "Partnerships"],
  },
  {
    title: "Company",
    links: ["About", "Security", "Privacy Policy", "Terms of Service", "Contact"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The AI-powered digital health passport — secure, scannable, and always with you.
            </p>
            <div className="mt-5 flex gap-2.5">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 transition-all hover:border-brand-400 hover:text-brand-500 dark:border-slate-800"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-7 dark:border-slate-800 sm:flex-row">
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} Health Passport AI. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            Made with <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> for better healthcare
          </p>
        </div>
      </div>
    </footer>
  );
}
