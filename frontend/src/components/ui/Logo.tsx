import { cn } from "@/lib/utils";
import { ShieldPlus } from "lucide-react";

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" }[size];
  const iconDims = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  const text = { sm: "text-sm", md: "text-base", lg: "text-xl" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className={cn("grid place-items-center rounded-xl bg-brand-600 text-white shadow-xs", dims)}>
        <ShieldPlus className={iconDims} />
      </span>
      <span className={cn("font-bold tracking-tight text-slate-900 dark:text-white", text)}>
        Health<span className="text-brand-600 dark:text-brand-400 font-extrabold">Passport</span>
      </span>
    </span>
  );
}
