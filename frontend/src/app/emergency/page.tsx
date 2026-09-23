"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmergencyAccessPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-slate-400 text-xs font-medium animate-pulse">
        Redirecting to Health Passport Dashboard…
      </div>
    </main>
  );
}
