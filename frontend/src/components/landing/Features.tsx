"use client";

import {
  BrainCircuit,
  CloudUpload,
  Lock,
  QrCode,
  ScanText,
  Siren,
} from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BrainCircuit,
    title: "AI Medical Summary",
    desc: "Gemini-powered analysis that builds a clear timeline of diagnoses, medications, and insights.",
    gradient: "from-brand-500 to-sky-600",
    glow: "group-hover:shadow-glow",
  },
  {
    icon: QrCode,
    title: "QR Health Passport",
    desc: "One secure QR code carries your entire medical identity. Scan it anywhere, anytime.",
    gradient: "from-teal-500 to-emerald-600",
    glow: "group-hover:shadow-glow-teal",
  },
  {
    icon: ScanText,
    title: "OCR Report Scanner",
    desc: "Photograph or upload any PDF, JPG, or PNG. Tesseract OCR extracts the text automatically.",
    gradient: "from-sky-500 to-brand-600",
    glow: "group-hover:shadow-glow",
  },
  {
    icon: Siren,
    title: "Emergency Access",
    desc: "First responders instantly see blood group, allergies, and medications in read-only mode.",
    gradient: "from-rose-500 to-orange-500",
    glow: "group-hover:shadow-[0_0_24px_rgba(244,63,94,0.4)]",
  },
  {
    icon: CloudUpload,
    title: "Secure Cloud Storage",
    desc: "Firebase-backed encrypted storage keeps every report safe, backed up, and always reachable.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "group-hover:shadow-glow-teal",
  },
  {
    icon: Lock,
    title: "Privacy Protected",
    desc: "JWT-secured, role-based access and a full audit trail. Your data belongs to you.",
    gradient: "from-indigo-500 to-brand-600",
    glow: "group-hover:shadow-glow",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-title">Features</p>
          <h2 className="h2-title">Everything your health needs, in one passport</h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            From AI intelligence to emergency readiness — a complete digital health companion.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="glass card-hover group h-full p-7">
                <div
                  className={cn(
                    "mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300",
                    f.gradient,
                    f.glow
                  )}
                >
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
