"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  ClipboardList,
  Download,
  FlaskConical,
  HeartPulse,
  Pill,
  RotateCw,
  ShieldPlus,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { AppShell, patientNav } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { Badge, severityTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReportViewer } from "@/components/dashboard/ReportViewer";
import { downloadPatientSummaryPDF } from "@/lib/pdf";
import { api } from "@/lib/api";
import { usePatientHome, mapTimeline, mapInsights } from "@/lib/use-patient";
import { formatDate } from "@/lib/utils";
import type { HealthInsight, TimelineEvent } from "@/types";

const typeStyles: Record<string, { icon: React.ElementType; color: string }> = {
  Diagnosis: { icon: Stethoscope, color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  Surgery: { icon: Activity, color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  Vaccination: { icon: Syringe, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  Medication: { icon: Pill, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  "Lab Report": { icon: FlaskConical, color: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300" },
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Medical History & Event Timeline
        </CardTitle>
        <Badge tone="neutral">{events.length} Events</Badge>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
            No medical history timeline events found. Upload your reports to construct your timeline.
          </p>
        ) : (
          <ol className="relative ml-2.5 space-y-5 border-l border-slate-200 dark:border-slate-800">
            {events.map((t) => {
              const meta = typeStyles[t.type] ?? typeStyles["Lab Report"];
              return (
                <li key={t.id} className="relative pl-6">
                  <span className={`absolute -left-[17px] grid h-8 w-8 place-items-center rounded-lg ${meta.color} border border-white dark:border-slate-900 shadow-2xs`}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">{formatDate(t.date)}</span>
                    <Badge tone={severityTone(t.severity ?? "info")}>{t.type}</Badge>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">{t.title}</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t.description}</p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicalHistoryCard({ patient }: { patient: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Active Regimen
          </CardTitle>
          <Badge tone="green">{patient.medications?.filter((m: any) => m.active !== false).length || 0} Active</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {patient.medications?.length === 0 ? (
            <p className="text-xs text-slate-400">No active medications recorded.</p>
          ) : (
            patient.medications?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</p>
                  <p className="text-[11px] text-slate-400">{m.dosage} · {m.frequency}</p>
                </div>
                <Badge tone={m.active !== false ? "green" : "neutral"}>{m.active !== false ? "Active" : "Completed"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Allergies & Reactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {patient.allergies?.length === 0 ? (
            <p className="text-xs text-slate-400">No allergies recorded.</p>
          ) : (
            patient.allergies?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{a.substance}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.reaction}</p>
                </div>
                <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Chronic Conditions & Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {patient.chronicDiseases?.length === 0 ? (
            <p className="text-xs text-slate-400">No chronic conditions recorded.</p>
          ) : (
            patient.chronicDiseases?.map((c: string) => (
              <Badge key={c} tone="rose">
                {c}
              </Badge>
            ))
          )}
          <Badge tone="neutral">Blood Group {patient.bloodGroup || "—"}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsCard({ insights, regenerating }: { insights: HealthInsight[]; regenerating: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BrainCircuit className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Clinical Insights & Summary
        </CardTitle>
        <Badge tone="brand">Gemini AI</Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {regenerating ? (
          <div className="py-6 text-center text-xs font-semibold text-slate-400 animate-pulse">
            Analyzing digitized timeline records…
          </div>
        ) : insights.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
            Upload lab reports to generate AI-assisted clinical insights.
          </p>
        ) : (
          insights.map((ins) => (
            <div key={ins.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{ins.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{ins.detail}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function SummaryPage() {
  const { data: home, loading: homeLoading } = usePatientHome();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [openReport, setOpenReport] = useState<any | null>(null);

  const loadInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await api<any>("/ai/summary");
      setInsights(mapInsights(res.insights));
    } catch {
      setInsights([]);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const regenerate = async () => {
    setRegenerating(true);
    await loadInsights();
    setRegenerating(false);
  };

  if (homeLoading || !home) {
    return (
      <AppShell navItems={patientNav} accent="brand">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  const patient = home.patient;
  const timeline = mapTimeline(home.reports);

  return (
    <AppShell navItems={patientNav} accent="brand">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Medical Summary</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A comprehensive clinical summary automatically generated from your digitized health records.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => downloadPatientSummaryPDF(patient, timeline, home.reports, insights)}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
            <Button size="sm" onClick={regenerate} loading={regenerating}>
              <RotateCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {aiLoading ? <Skeleton className="h-72 w-full rounded-2xl" /> : <InsightsCard insights={insights} regenerating={regenerating} />}
          <ClinicalHistoryCard patient={patient} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Timeline events={timeline} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FlaskConical className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                Lab Reports ({home.reports?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {home.reports?.length === 0 ? (
                <p className="text-xs text-slate-400">No lab reports uploaded.</p>
              ) : (
                home.reports?.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setOpenReport(r)}
                    className="w-full rounded-xl border border-slate-200/80 p-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{r.title}</p>
                      <span className="ml-2 shrink-0 text-[10px] text-slate-400">{r.date}</span>
                    </div>
                    {r.extracted && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{r.extracted}</p>}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ReportViewer report={openReport} onClose={() => setOpenReport(null)} />
    </AppShell>
  );
}
