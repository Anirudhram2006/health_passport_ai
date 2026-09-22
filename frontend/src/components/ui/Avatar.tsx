import { getInitials, hashToColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800", className)} />;
  }
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white dark:ring-slate-800",
        className
      )}
      style={{ background: hashToColor(name) }}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
