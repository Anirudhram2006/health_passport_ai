"use client";

import { AppShell, patientNav } from "@/components/layout/AppShell";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";

export default function DashboardPage() {
  return (
    <AppShell navItems={patientNav} accent="brand">
      <PatientDashboard />
    </AppShell>
  );
}
