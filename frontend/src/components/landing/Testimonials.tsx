"use client";

import { Quote, Star } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import { Avatar } from "@/components/ui/Avatar";

const testimonials = [
  {
    name: "Meera Nair",
    role: "Type 1 Diabetic Patient",
    quote:
      "I stopped carrying a folder of reports. My doctor scans my QR and sees my entire history in seconds — including allergies and meds. Life-changing.",
    stars: 5,
  },
  {
    name: "Dr. Rohan Mehta",
    role: "Cardiologist, Apollo Hospital",
    quote:
      "The AI summary gives me a clean 30-second overview before a consultation. It's like having a junior resident who already read every file.",
    stars: 5,
  },
  {
    name: "Anita Deshpande",
    role: "Mother of two",
    quote:
      "When my daughter had an emergency, the paramedics scanned her passport and knew about her penicillin allergy instantly. It saved precious minutes.",
    stars: 5,
  },
  {
    name: "Vikram Singh",
    role: "Frequent Traveler",
    quote:
      "My passport travels with me. Any hospital, any city — my vaccination records and blood group are always one scan away.",
    stars: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-title">Testimonials</p>
          <h2 className="h2-title">Loved by patients &amp; doctors</h2>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="glass card-hover relative flex h-full flex-col p-6">
                <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-100 dark:text-brand-900" aria-hidden />
                <div className="mb-4 flex gap-1" aria-label={`${t.stars} out of 5 stars`}>
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <Avatar name={t.name} />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
