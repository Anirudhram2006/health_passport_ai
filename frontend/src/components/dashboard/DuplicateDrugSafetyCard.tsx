"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Copy, FileText, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface DuplicateMedicationDetail {
  name: string;
  brandName?: string;
  genericName?: string;
  activeIngredients?: string[];
  strength?: string;
  dosageForm?: string;
  sources?: { prescriptionId: string; fileName: string }[];
}

export interface DuplicateItem {
  duplicateType: "SAME_ACTIVE_INGREDIENT" | "SAME_COMBINATION" | "INGREDIENT_OVERLAP";
  title: string;
  sharedIngredients: string[];
  medicationA: DuplicateMedicationDetail;
  medicationB: DuplicateMedicationDetail;
  strengthComparison: string;
  dosageFormComparison: string;
  explanation: string;
}

export interface DuplicateGroup {
  activeIngredient: string;
  title?: string;
  duplicateType: "SAME_ACTIVE_INGREDIENT" | "SAME_COMBINATION" | "INGREDIENT_OVERLAP";
  count: number;
  medicines: DuplicateMedicationDetail[];
  explanation: string;
}

export interface DuplicateCheckResponse {
  status: "DUPLICATES_FOUND" | "NO_DUPLICATES_FOUND" | "MEDICINE_NEEDS_REVIEW" | "SERVICE_UNAVAILABLE";
  prescriptionsAnalyzedCount?: number;
  failedPrescriptionsCount?: number;
  totalExtractedMedsCount?: number;
  checkedMedicationsCount: number;
  analyzedPairsCount: number;
  duplicatesCount: number;
  duplicateGroupsCount: number;
  duplicateGroups: DuplicateGroup[];
  duplicates: DuplicateItem[];
  unverifiedItems?: any[];
  disclaimer: string;
}

interface DuplicateDrugSafetyCardProps {
  duplicateResult: DuplicateCheckResponse | null;
  loading?: boolean;
}

export function DuplicateDrugSafetyCard({ duplicateResult, loading }: DuplicateDrugSafetyCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className="animate-pulse border-amber-200 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10">
        <CardContent className="p-5 text-center text-xs font-medium text-slate-500">
          Analyzing medications across all prescriptions for active ingredient duplicates &amp; overlaps…
        </CardContent>
      </Card>
    );
  }

  if (!duplicateResult) return null;

  const {
    status,
    checkedMedicationsCount,
    duplicateGroupsCount,
    duplicateGroups,
    duplicates,
    unverifiedItems,
    disclaimer,
  } = duplicateResult;

  const groupsList = duplicateGroups || [];
  const hasDuplicates = status === "DUPLICATES_FOUND" && groupsList.length > 0;

  return (
    <Card
      className={`overflow-hidden transition-all ${
        hasDuplicates
          ? "border-amber-300 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/20"
          : status === "NO_DUPLICATES_FOUND"
          ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
          : "border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20"
      }`}
    >
      <CardHeader className="cursor-pointer select-none py-3.5" onClick={() => setExpanded((prev) => !prev)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {hasDuplicates ? (
              <Copy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : status === "NO_DUPLICATES_FOUND" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            Duplicate Drug &amp; Active Ingredient Overlap Detection
          </CardTitle>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {checkedMedicationsCount} confirmed meds checked
            </span>

            {hasDuplicates ? (
              <Badge tone="amber">{groupsList.length} Active Ingredient Issue(s)</Badge>
            ) : status === "NO_DUPLICATES_FOUND" ? (
              <Badge tone="green">No Ingredient Duplicates Found</Badge>
            ) : (
              <Badge tone="amber">Verification Required</Badge>
            )}

            <button className="text-slate-400">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-1">
          {/* Status Banners */}
          {status === "NO_DUPLICATES_FOUND" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-100/60 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold">No duplicate active ingredients detected.</p>
                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  Evaluated normalized active ingredients across all uploaded prescriptions and active health records.
                </p>
              </div>
            </div>
          )}

          {status === "MEDICINE_NEEDS_REVIEW" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-100/60 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Medicine verification required before completing duplicate check.</p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  Unverified medications were excluded to prevent false duplicate assumptions.
                </p>
              </div>
            </div>
          )}

          {/* Grouped Active Ingredient Cards */}
          {hasDuplicates && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Grouped Active Ingredient Issues ({groupsList.length})
              </h4>

              {groupsList.map((group, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-amber-200 bg-white p-4 shadow-xs dark:border-amber-900/60 dark:bg-slate-900 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        🧪 ACTIVE INGREDIENT: {group.activeIngredient.toUpperCase()}
                      </span>
                    </div>

                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {group.duplicateType.replace(/_/g, " ")} · {group.count} Medications
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {group.explanation}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.medicines.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-800/50 space-y-1"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                        {m.genericName && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Composition: {m.genericName}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                          <span>Dosage: <strong>{m.strength}</strong></span>
                          <span>Form: <strong>{m.dosageForm}</strong></span>
                        </div>
                        {m.sources && m.sources.length > 0 && (
                          <div className="text-[9px] font-semibold text-brand-700 dark:text-brand-300 pt-1">
                            Sources:
                            <ul className="mt-0.5 space-y-0.5">
                              {m.sources.map((s, sIdx) => (
                                <li key={sIdx} className="flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-400">
                                  <FileText className="h-3 w-3 shrink-0 text-brand-500" />
                                  {s.fileName}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unverified Items Warning */}
          {unverifiedItems && unverifiedItems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/30 space-y-1.5 text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Unverified Medicines Excluded ({unverifiedItems.length})
              </span>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {unverifiedItems.map((uItem, uIdx) => (
                  <div key={uIdx} className="rounded-lg bg-white p-2 text-[11px] border border-amber-200 dark:bg-slate-900 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200">"{uItem.name}"</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">{uItem.reason}</p>
                  </div>
                ))}
              </div>
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
