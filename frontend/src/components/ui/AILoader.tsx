"use client";

import { Brain, CheckCircle2, FileText, ScanText, Sparkles, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const steps = [
  { id: 0, label: "Uploading report", icon: UploadCloud },
  { id: 1, label: "OCR extraction", icon: ScanText },
  { id: 2, label: "AI analysis", icon: Brain },
  { id: 3, label: "Generating summary", icon: Sparkles },
];

export function AIStepLoader({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="relative mb-10 grid place-items-center">
        <div className="absolute h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 via-teal-500 to-mint shadow-glow">
          {currentStep >= 2 ? (
            <motion.div
              initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <Brain className="h-14 w-14 text-white" />
            </motion.div>
          ) : (
            <FileText className="h-14 w-14 animate-bounce-soft text-white" />
          )}
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-mint" />
          </span>
        </div>

        {/* orbiting dots */}
        <div className="absolute h-52 w-52 animate-[ai-orbit_14s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-400" />
        </div>
        <div className="absolute h-52 w-52 animate-[ai-orbit_14s_linear_infinite_reverse]">
          <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-teal-400" />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((s) => {
          const done = currentStep > s.id;
          const active = currentStep === s.id;
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-5 py-3.5 transition-all duration-300",
                active && "border-brand-300 bg-brand-50 shadow-glow dark:bg-brand-950/40",
                done && "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
                !active && !done && "border-slate-200 bg-white/60 opacity-60 dark:border-slate-700 dark:bg-slate-900/50"
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  done ? "bg-emerald-500 text-white" : active ? "bg-brand-gradient text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className={cn("h-5 w-5", active && "animate-pulse")} />}
              </span>
              <div className="flex-1">
                <p className={cn("text-sm font-semibold", done ? "text-emerald-700 dark:text-emerald-300" : active ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400")}>
                  {s.label}
                </p>
                {active && <p className="text-xs text-slate-400">Processing…</p>}
              </div>
              {active && (
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full w-full animate-gradient-x rounded-full bg-gradient-to-r from-brand-500 to-mint bg-[length:200%_100%]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AIThinkingBubble({ text = "Gemini is analyzing your health records…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 dark:border-brand-900 dark:bg-brand-950/40">
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-brand-gradient">
        <Sparkles className="h-5 w-5 text-white" />
        <span className="absolute -inset-1 animate-ping rounded-full bg-brand-400/30" />
      </span>
      <div className="flex-1">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-brand-500 animate-bounce-soft"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs font-medium text-brand-700 dark:text-brand-300">{text}</p>
      </div>
    </div>
  );
}
