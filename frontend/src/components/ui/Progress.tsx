"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  gradient?: boolean;
}

export function Progress({ value, className, barClassName, gradient = true }: ProgressProps) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-1000 ease-out",
          gradient
            ? "bg-gradient-to-r from-brand-500 via-teal-500 to-mint"
            : "bg-brand-500",
          barClassName
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 10, label, sublabel }: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a9fe8" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{label ?? `${value}`}</div>
        {sublabel && <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{sublabel}</div>}
      </div>
    </div>
  );
}
