"use client";

import { ArrowRight, BrainCircuit, FileUp, Hospital, QrCode, ScanText } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const steps = [
  {
    icon: FileUp,
    step: "01",
    title: "Upload",
    desc: "Drop in any medical report — prescriptions, lab results, discharge notes.",
  },
  {
    icon: ScanText,
    step: "02",
    title: "OCR",
    desc: "Tesseract extracts the text from PDFs, JPGs, and PNGs automatically.",
  },
  {
    icon: BrainCircuit,
    step: "03",
    title: "AI Summary",
    desc: "Gemini structures the data into diagnoses, medications, and allergies.",
  },
  {
    icon: QrCode,
    step: "04",
    title: "QR Passport",
    desc: "Your complete history is encoded into one secure, scannable QR.",
  },
  {
    icon: Hospital,
    step: "05",
    title: "Hospital Access",
    desc: "Doctors scan, read, and update — with your full consent and audit trail.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-brand-gradient-soft py-24">
      <div className="bg-dots absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-title">How it works</p>
          <h2 className="h2-title">From paper pile to health passport in 5 steps</h2>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.1} className="relative">
              <div className="glass card-hover group relative h-full p-6 text-center">
                <span className="absolute right-4 top-4 text-4xl font-extrabold text-slate-100 dark:text-slate-800">
                  {s.step}
                </span>
                <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white text-brand-600 shadow-glass transition-transform duration-300 group-hover:scale-110 group-hover:text-teal-500 dark:bg-slate-800">
                  <s.icon className="h-8 w-8" />
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>

              {i < steps.length - 1 && (
                <span className="absolute -right-6 top-1/2 z-10 hidden -translate-y-1/2 text-brand-400 lg:block" aria-hidden>
                  <ArrowRight className="h-6 w-6 animate-pulse" />
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
