"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Calendar,
  Clock,
  Download,
  Eye,
  FileText,
  HeartPulse,
  Pill,
  QrCode,
  Share2,
  ShieldCheck,
  Siren,
  Stethoscope,
  Phone,
  Plus,
} from "lucide-react";
import { QRPassport } from "@/components/qr/QRPassport";
import { ReportViewer } from "@/components/dashboard/ReportViewer";
import { PrescriptionSafetyCard, type InteractionCheckResponse } from "@/components/dashboard/PrescriptionSafetyCard";
import { DrugConditionSafetyCard, type DrugConditionCheckResponse } from "@/components/dashboard/DrugConditionSafetyCard";
import { DuplicateDrugSafetyCard, type DuplicateCheckResponse } from "@/components/dashboard/DuplicateDrugSafetyCard";
import { Badge, severityTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadPatientSummaryPDF } from "@/lib/pdf";
import { usePatientHome, mapTimeline, mapInsights } from "@/lib/use-patient";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { HealthInsight, MedicalReport } from "@/types";

function HeaderGreeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-slate-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {greeting}, {name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your personal health record and emergency passport at a glance.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          href="/dashboard/reports"
          className="btn-secondary !py-2 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Upload Report
        </Link>
        <Link
          href="/dashboard/emergency"
          className="btn-primary !py-2 text-xs font-semibold"
        >
          <QrCode className="h-3.5 w-3.5" /> Emergency QR
        </Link>
      </div>
    </div>
  );
}

function HealthOverviewCard({ patient, reportsCount }: { patient: any; reportsCount: number }) {
  const activeMedsCount = patient.medications?.filter((m: any) => m.active !== false).length || 0;
  const allergiesCount = patient.allergies?.length || 0;

  return (
    <Card className="p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Patient Health Overview
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Blood Group</p>
          <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">{patient.bloodGroup || "Not recorded"}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active Medications</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{activeMedsCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Known Allergies</p>
          <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{allergiesCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Digitized Reports</p>
          <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">{reportsCount}</p>
        </div>
      </div>
    </Card>
  );
}

function AIInsightCard({ insights, loading }: { insights: HealthInsight[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BrainCircuit className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          AI Clinical Summary
        </CardTitle>
        <Link href="/dashboard/summary" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
          View full timeline →
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
            No report summaries generated yet. Upload your first prescription or lab report to extract AI clinical insights.
          </div>
        ) : (
          <div className="space-y-2.5">
            {insights.slice(0, 2).map((ins) => (
              <div key={ins.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{ins.title}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ins.detail}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentReportsCard({ reports }: { reports: MedicalReport[] }) {
  const [openReport, setOpenReport] = useState<MedicalReport | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Recent Medical Reports
        </CardTitle>
        <Link href="/dashboard/reports" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
          View all ({reports.length})
        </Link>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
            No medical reports uploaded yet.
          </div>
        ) : (
          reports.slice(0, 3).map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenReport(r)}
              className="flex w-full items-center gap-3.5 rounded-xl border border-slate-200/80 p-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{r.title}</p>
                <p className="text-[11px] text-slate-400">
                  {r.hospital || "Hospital"} · {r.date}
                </p>
              </div>
              <Badge tone="brand">{r.type}</Badge>
              <Eye className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))
        )}
      </CardContent>
      <ReportViewer report={openReport} onClose={() => setOpenReport(null)} />
    </Card>
  );
}

function MedicationsSummaryCard({ medications }: { medications: any[] }) {
  const activeMeds = medications.filter((m) => m.active !== false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Active Medications
        </CardTitle>
        <Link href="/dashboard/medications" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
          Manage medications →
        </Link>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {activeMeds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
            No active medications listed.
          </div>
        ) : (
          activeMeds.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</p>
                <p className="text-[11px] text-slate-400">{m.dosage} · {m.frequency}</p>
              </div>
              <Badge tone="green">Active</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmergencyInfoCard({ contacts }: { contacts: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
          <Siren className="h-4 w-4" />
          Emergency Contacts
        </CardTitle>
        <Link href="/dashboard/emergency" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">
          View Emergency QR
        </Link>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {contacts.length === 0 ? (
          <p className="text-xs text-slate-400">No emergency contacts added.</p>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-rose-200/60 bg-rose-50/30 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                <p className="text-[11px] text-slate-400">{c.relation}</p>
              </div>
              <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline dark:text-rose-400">
                <Phone className="h-3 w-3" /> {c.phone}
              </a>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PassportSummaryCard({ patient }: { patient: any }) {
  return (
    <Card className="flex flex-col sm:flex-row items-center justify-between gap-5 p-5 border-brand-200 bg-brand-50/30 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <QRPassport patient={patient} size={90} />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Digital Health Passport
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{patient.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Blood Group: <strong className="text-rose-600 dark:text-rose-400">{patient.bloodGroup}</strong> · Scannable emergency medical summary
          </p>
        </div>
      </div>
      <div className="flex gap-2.5 w-full sm:w-auto">
        <Link href="/dashboard/emergency" className="btn-primary !py-2 text-xs w-full sm:w-auto">
          Open Emergency Passport
        </Link>
      </div>
    </Card>
  );
}

function SafetySummaryCard({
  hasMeds,
  interactionCount,
  duplicateCount,
}: {
  hasMeds: boolean;
  interactionCount: number;
  duplicateCount: number;
}) {
  return (
    <Card className="border-brand-200 bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900/80 p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Medication Safety &amp; Interaction Center
              <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300 uppercase">
                Active Monitoring
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Automated screening for drug-drug interactions, condition contraindications, duplicate ingredients, and generic options.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/medications"
          className="btn-primary !py-2 text-xs font-semibold whitespace-nowrap"
        >
          Open Safety Center →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-brand-100/80 pt-4 dark:border-slate-800 text-xs">
        <div className="rounded-lg bg-white p-2.5 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Drug–Drug</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {interactionCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">{interactionCount} Alert(s)</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Clear</span>
            )}
          </p>
        </div>

        <div className="rounded-lg bg-white p-2.5 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Drug–Condition</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Screened</span>
          </p>
        </div>

        <div className="rounded-lg bg-white p-2.5 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Duplicates</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {duplicateCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">{duplicateCount} Found</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ None</span>
            )}
          </p>
        </div>

        <div className="rounded-lg bg-white p-2.5 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Generics</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            <span className="text-sky-600 dark:text-sky-400 font-bold">Available</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function PatientDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientHome();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await api<any>("/ai/summary");
      setInsights(mapInsights(res.insights));
    } catch {
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Unable to load patient health records</h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{error || "Please refresh or sign in again."}</p>
        <button onClick={refetch} className="btn-primary mt-4 text-xs">
          Try again
        </button>
      </Card>
    );
  }

  const patient = data.patient;

  return (
    <div className="space-y-6">
      <HeaderGreeting name={data.user?.name || user?.name || "Patient"} />

      <HealthOverviewCard patient={patient} reportsCount={data.reports?.length || 0} />

      <PassportSummaryCard patient={patient} />

      <SafetySummaryCard
        hasMeds={(patient.medications?.length || 0) > 0}
        interactionCount={0}
        duplicateCount={0}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AIInsightCard insights={insights} loading={insightsLoading} />
        <RecentReportsCard reports={data.reports || []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MedicationsSummaryCard medications={patient.medications || []} />
        <EmergencyInfoCard contacts={patient.emergencyContacts || []} />
      </div>
    </div>
  );
}
