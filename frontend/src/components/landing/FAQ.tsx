"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Is my medical data really secure?",
    a: "Yes. Health Passport AI uses JWT-secured authentication, role-based access control, and encrypted cloud storage on Firebase. Every access is written to an immutable audit log, and you remain the sole owner of your data.",
  },
  {
    q: "How does emergency access work without my password?",
    a: "The QR on your passport is designed for read-only emergency access. First responders can scan it and instantly see your blood group, allergies, medications, and emergency contacts — but they cannot modify anything.",
  },
  {
    q: "Can I scan old paper reports?",
    a: "Absolutely. Just photograph or upload any PDF, JPG, or PNG. Tesseract OCR extracts the text, and the Gemini AI structures it into your medical summary. You can upload unlimited historical records.",
  },
  {
    q: "Can my doctor update my records?",
    a: "Yes. With your consent, your doctor can add consultation notes, prescriptions, and lab reports to your passport. Every update requires authorization and is fully audited.",
  },
  {
    q: "Which hospitals support Health Passport AI?",
    a: "Over 120 partner hospitals across India currently support QR-based passport access, including Apollo, Max, AIIMS, and Fortis. More are onboarding every month.",
  },
  {
    q: "Is there a cost for patients?",
    a: "The core passport, OCR scanning, and AI summaries are free for patients. Premium plans offer advanced insights and priority support.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <Reveal className="text-center">
          <p className="section-title">FAQ</p>
          <h2 className="h2-title">Frequently asked questions</h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className={cn("glass overflow-hidden transition-all duration-300", isOpen && "border-brand-300 shadow-glow")}>
                  <button
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">{f.q}</span>
                    <ChevronDown
                      className={cn("h-5 w-5 shrink-0 text-brand-500 transition-transform duration-300", isOpen && "rotate-180")}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="px-6 pb-5 leading-relaxed text-slate-500 dark:text-slate-400">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
