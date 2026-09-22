"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Pill, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface DrugConditionResult {
  drug: { id?: string; name: string; genericName?: string; rxCui?: string; sources?: any[] };
  condition: { id?: string; name: string; code?: string };
  interactionFound: boolean;
  severity: "Low" | "Moderate" | "High" | "Contraindicated";
  description: string;
  potentialClinicalEffect?: string;
  management?: string;
  source?: string;
  sourceRuleId?: string;
  confidence?: string;
  requiresReview?: boolean;
}

export interface DrugConditionCheckResponse {
  status: "INTERACTION_FOUND" | "NO_INTERACTION_FOUND" | "MEDICINE_NEEDS_REVIEW" | "CONDITION_NEEDS_REVIEW" | "SERVICE_UNAVAILABLE";
  confirmedMedicationsCount: number;
  confirmedConditionsCount: number;
  analyzedPairsCount: number;
  interactions: DrugConditionResult[];
  confirmedMedications?: any[];
  confirmedConditions?: any[];
  unverifiedMedicines?: any[];
  unverifiedConditions?: any[];
  disclaimer: string;
}

interface DrugConditionSafetyCardProps {
  checkResult: DrugConditionCheckResponse | null;
  loading?: boolean;
}

export function DrugConditionSafetyCard({ checkResult, loading }: DrugConditionSafetyCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 text-center text-xs text-slate-400">
          Evaluating patient's confirmed medications against medical history &amp; conditions...
        </CardContent>
      </Card>
    );
  }

  if (!checkResult) return null;

  const {
    status,
    confirmedMedicationsCount,
    confirmedConditionsCount,
    interactions,
    confirmedMedications,
    confirmedConditions,
    unverifiedMedicines,
    unverifiedConditions,
    disclaimer,
  } = checkResult;

  const hasInteractions = status === "INTERACTION_FOUND" && interactions.length > 0;

  // Deduplicate conditions by cleaned lowercase name to prevent repetitive pill spam
  const uniqueConditionsList = Array.from(
    new Set((confirmedConditions || []).map((c: any) => (c?.name || "").replace(/\s*\(.*?\)\s*/g, "").trim()).filter(Boolean))
  );

  // Deduplicate medications by name
  const uniqueMedicationsList = Array.from(
    new Set((confirmedMedications || []).map((m: any) => m?.genericName || m?.name || "").filter(Boolean))
  );

  return (
    <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <CardHeader className="cursor-pointer select-none py-3.5 bg-slate-50/70 border-b border-slate-100 dark:bg-slate-950/40 dark:border-slate-800" onClick={() => setExpanded((prev) => !prev)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            {hasInteractions ? (
              <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            ) : status === "NO_INTERACTION_FOUND" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            Drug–Condition Safety Analysis
          </CardTitle>

          <div className="flex items-center gap-2">
            {hasInteractions ? (
              <Badge tone="rose">{interactions.length} Interaction Alert(s)</Badge>
            ) : status === "NO_INTERACTION_FOUND" ? (
              <Badge tone="green">✓ No Interactions Found</Badge>
            ) : (
              <Badge tone="amber">Review Required</Badge>
            )}

            <button className="text-slate-400">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 p-5">
          {/* Summary Box: Evaluated Conditions & Medications */}
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <Activity className="h-3.5 w-3.5 text-violet-500" /> Medical Conditions ({uniqueConditionsList.length}):
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {uniqueConditionsList.length > 0 ? uniqueConditionsList.join(", ") : "No chronic medical conditions recorded."}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <Pill className="h-3.5 w-3.5 text-teal-500" /> Screened Medications ({uniqueMedicationsList.length}):
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {uniqueMedicationsList.length > 0 ? uniqueMedicationsList.join(", ") : "No active medications."}
              </p>
            </div>
          </div>

          {/* Status Messages */}
          {status === "NO_INTERACTION_FOUND" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold">No drug–condition contraindications detected.</p>
                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  All active medications were screened against your medical history with zero known disease interactions.
                </p>
              </div>
            </div>
          )}

          {status === "SERVICE_UNAVAILABLE" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Interaction screening service is temporarily unavailable.</p>
                <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">
                  Please verify prescriptions with a physician.
                </p>
              </div>
            </div>
          )}

          {/* List of Detected Drug-Condition Interactions */}
          {hasInteractions && (
            <div className="space-y-3">
              {interactions.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-rose-200 bg-white p-4 shadow-2xs dark:border-rose-900/60 dark:bg-slate-900 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5 text-teal-600" />
                      {item.drug.name}
                      <span className="text-rose-500 font-normal px-1">┼</span>
                      <Activity className="h-3.5 w-3.5 text-violet-600" />
                      {item.condition.name}
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.severity === "High" || item.severity === "Contraindicated"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {item.severity} Severity
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{item.description}</p>

                  {item.potentialClinicalEffect && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>Clinical Concern:</strong> {item.potentialClinicalEffect}
                    </p>
                  )}

                  {item.management && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>Recommendation:</strong> {item.management}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Clinical Safety Disclaimer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            <strong>Clinical Safety Disclaimer:</strong> {disclaimer}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
