"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Pill,
  Sparkles,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface PrescriptionSource {
  prescriptionId: string;
  fileName: string;
}

export interface DrugInteractionResult {
  drugA: { name: string; genericName?: string; rxCui?: string; sources?: PrescriptionSource[] };
  drugB: { name: string; genericName?: string; rxCui?: string; sources?: PrescriptionSource[] };
  interactionFound: boolean;
  severity: "minor" | "moderate" | "major" | "severe" | "contraindicated" | "unknown" | "none";
  description: string;
  clinicalEffect?: string;
  management?: string;
  source?: string;
  sourceRuleId?: string;
  confidence?: string;
  requiresReview?: boolean;
}

export interface DuplicateItem {
  duplicateType: "SAME_ACTIVE_INGREDIENT" | "SAME_COMBINATION" | "INGREDIENT_OVERLAP";
  title: string;
  sharedIngredients: string[];
  medicationA: {
    name: string;
    brandName?: string;
    genericName?: string;
    strength?: string;
    dosageForm?: string;
    sources?: PrescriptionSource[];
  };
  medicationB: {
    name: string;
    brandName?: string;
    genericName?: string;
    strength?: string;
    dosageForm?: string;
    sources?: PrescriptionSource[];
  };
  strengthComparison?: string;
  dosageFormComparison?: string;
  explanation: string;
}

export interface DuplicateDetectionResult {
  status: "NO_DUPLICATES_FOUND" | "DUPLICATES_FOUND" | "MEDICINE_NEEDS_REVIEW" | "SERVICE_UNAVAILABLE";
  prescriptionsAnalyzedCount?: number;
  checkedMedicationsCount?: number;
  duplicatesCount: number;
  duplicates: DuplicateItem[];
  duplicateGroups?: any[];
  unverifiedItems?: any[];
  disclaimer?: string;
}

export interface AlternativeItem {
  name: string;
  brandName: string;
  genericName: string;
  activeIngredients: string[];
  strength: string;
  dosageForm: string;
  manufacturer: string;
  isGeneric: boolean;
  matchType: string;
  matchScore: number;
  source: string;
  verified: boolean;
  explanation: string;
}

export interface GenericAlternativeMedicationResult {
  status: "ALTERNATIVES_FOUND" | "NO_VALIDATED_ALTERNATIVE" | "MEDICINE_UNVERIFIED" | "DATABASE_UNAVAILABLE";
  requiresReview?: boolean;
  message: string;
  medication: {
    name: string;
    brandName?: string;
    genericName?: string;
    activeIngredients?: string[];
    strength?: string;
    dosageForm?: string;
    sources?: PrescriptionSource[];
  };
  alternatives: AlternativeItem[];
  disclaimer?: string;
}

export interface GenericAlternativesBatchResult {
  status: "ALTERNATIVES_FOUND" | "NO_VALIDATED_ALTERNATIVE" | "SERVICE_UNAVAILABLE";
  medicationsCount: number;
  medications: GenericAlternativeMedicationResult[];
}

export interface InteractionCheckResponse {
  status: "INTERACTION_FOUND" | "NO_INTERACTION_FOUND" | "MEDICINE_UNKNOWN" | "MEDICINE_NEEDS_REVIEW" | "SERVICE_UNAVAILABLE";
  prescriptionsAnalyzedCount?: number;
  failedPrescriptionsCount?: number;
  totalExtractedMedsCount?: number;
  uniqueNormalizedMedsCount?: number;
  checkedMedicationsCount: number;
  analyzedPairsCount: number;
  interactions: DrugInteractionResult[];
  unverifiedItems?: any[];
  duplicateDetection?: DuplicateDetectionResult;
  genericAlternatives?: GenericAlternativesBatchResult;
  disclaimer: string;
}

interface PrescriptionSafetyCardProps {
  checkResult: InteractionCheckResponse | null;
  loading?: boolean;
}

export function PrescriptionSafetyCard({ checkResult, loading }: PrescriptionSafetyCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 text-center text-xs font-semibold text-slate-500">
          Analyzing medications across all prescriptions for interactions, active ingredient duplicates, and generic alternatives…
        </CardContent>
      </Card>
    );
  }

  if (!checkResult) return null;

  const {
    status,
    prescriptionsAnalyzedCount,
    failedPrescriptionsCount,
    totalExtractedMedsCount,
    uniqueNormalizedMedsCount,
    checkedMedicationsCount,
    analyzedPairsCount,
    interactions,
    unverifiedItems,
    duplicateDetection,
    genericAlternatives,
    disclaimer,
  } = checkResult;

  const hasInteractions = status === "INTERACTION_FOUND" && interactions.length > 0;
  const hasDuplicates = duplicateDetection && duplicateDetection.duplicatesCount > 0;
  const hasGenericOptions = genericAlternatives && genericAlternatives.medications.some((m) => m.status === "ALTERNATIVES_FOUND" && m.alternatives.length > 0);

  return (
    <Card
      className={`overflow-hidden transition-all ${
        hasInteractions || hasDuplicates
          ? "border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <CardHeader className="cursor-pointer select-none py-3.5 bg-slate-50/70 border-b border-slate-100 dark:bg-slate-950/40 dark:border-slate-800" onClick={() => setExpanded((prev) => !prev)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            {hasInteractions ? (
              <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            ) : hasDuplicates ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            Medication Safety & Multi-Prescription Analysis
          </CardTitle>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uniqueNormalizedMedsCount ?? checkedMedicationsCount} Unique Medicines Evaluated
            </span>

            {hasInteractions ? (
              <Badge tone="rose">{interactions.length} Interaction(s)</Badge>
            ) : (
              <Badge tone="green">No Interactions</Badge>
            )}

            {hasDuplicates ? (
              <Badge tone="amber">{duplicateDetection.duplicatesCount} Duplicate(s)</Badge>
            ) : (
              <Badge tone="neutral">0 Duplicates</Badge>
            )}

            <button className="text-slate-400">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 p-5">
          {/* Multi-Prescription Overview Pill Bar */}
          {prescriptionsAnalyzedCount !== undefined && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                📄 {prescriptionsAnalyzedCount} Prescription(s) Analyzed
              </span>
              {totalExtractedMedsCount !== undefined && (
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  💊 {totalExtractedMedsCount} Total Medicines Extracted
                </span>
              )}
              {uniqueNormalizedMedsCount !== undefined && (
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  🧬 {uniqueNormalizedMedsCount} Unique Normalized Medicines
                </span>
              )}
              {failedPrescriptionsCount ? (
                <span className="rounded-xl bg-rose-100 px-3 py-1.5 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  ⚠ {failedPrescriptionsCount} File(s) Failed Processing
                </span>
              ) : null}
            </div>
          )}

          {/* SECTION 1: DRUG-DRUG INTERACTIONS */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Pill className="h-4 w-4 text-brand-500" />
                Drug–Drug Interaction Analysis
              </h3>
              <Badge tone={hasInteractions ? "rose" : "green"}>
                {hasInteractions ? `${interactions.length} Alert(s)` : "✓ Clear"}
              </Badge>
            </div>

            {!hasInteractions ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-100/60 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold">No known interaction found in the configured interaction database.</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    Evaluated all unique pairs across uploaded prescriptions and active health records.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-rose-200 bg-white p-3.5 shadow-xs dark:border-rose-900/60 dark:bg-slate-900 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {item.drugA.name} <span className="text-rose-500 font-normal px-1">┼</span> {item.drugB.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          item.severity === "major" || item.severity === "severe" || item.severity === "contraindicated"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {item.severity} Severity
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.drugA.name} Origin:</span>
                        <ul className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                          {(item.drugA.sources || [{ prescriptionId: "unknown", fileName: "Uploaded Document" }]).map((s, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                              <FileText className="h-3 w-3 shrink-0 text-brand-500" />
                              {s.fileName}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.drugB.name} Origin:</span>
                        <ul className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                          {(item.drugB.sources || [{ prescriptionId: "unknown", fileName: "Uploaded Document" }]).map((s, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                              <FileText className="h-3 w-3 shrink-0 text-brand-500" />
                              {s.fileName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{item.description}</p>
                    {item.clinicalEffect && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Potential Effect:</strong> {item.clinicalEffect}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: MODULE 7 DUPLICATE DRUG DETECTION */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                Module 7: Duplicate Drug &amp; Active Ingredient Overlap Detection
              </h3>
              <Badge tone={hasDuplicates ? "amber" : "neutral"}>
                {hasDuplicates ? `${duplicateDetection.duplicatesCount} Duplicates` : "0 Duplicates"}
              </Badge>
            </div>

            {!duplicateDetection || duplicateDetection.duplicatesCount === 0 ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-100/60 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold">✓ No duplicate active ingredients detected across analyzed prescriptions.</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    No active ingredient overlaps or redundant multi-drug combinations found.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {duplicateDetection.duplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-300 bg-white p-3.5 shadow-xs dark:border-amber-900/60 dark:bg-slate-900 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {dup.medicationA.name} <span className="text-amber-500 font-normal px-1">⇋</span> {dup.medicationB.name}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {dup.duplicateType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="rounded-lg bg-amber-50/60 p-2 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Shared Active Ingredient(s): <strong>{dup.sharedIngredients.join(", ")}</strong>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{dup.medicationA.name} ({dup.medicationA.strength}):</span>
                        <ul className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                          {(dup.medicationA.sources || [{ prescriptionId: "unknown", fileName: "Uploaded Document" }]).map((s, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                              <FileText className="h-3 w-3 shrink-0 text-brand-500" />
                              {s.fileName}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{dup.medicationB.name} ({dup.medicationB.strength}):</span>
                        <ul className="mt-0.5 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                          {(dup.medicationB.sources || [{ prescriptionId: "unknown", fileName: "Uploaded Document" }]).map((s, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                              <FileText className="h-3 w-3 shrink-0 text-brand-500" />
                              {s.fileName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{dup.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: MODULE 8 GENERIC ALTERNATIVE SUGGESTION */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Module 8: Generic Alternative Suggestions
              </h3>
              <Badge tone={hasGenericOptions ? "green" : "neutral"}>
                {hasGenericOptions ? "Alternatives Available" : "Evaluated"}
              </Badge>
            </div>

            {!genericAlternatives || genericAlternatives.medications.length === 0 ? (
              <div className="rounded-xl bg-slate-100 p-3 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                No confirmed medications available to search generic alternatives.
              </div>
            ) : (
              <div className="space-y-4">
                {genericAlternatives.medications.map((medResult, mIdx) => {
                  const hasAlts = medResult.status === "ALTERNATIVES_FOUND" && medResult.alternatives.length > 0;
                  return (
                    <div
                      key={mIdx}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {medResult.medication?.name}
                          </span>
                          {medResult.medication?.genericName && (
                            <span className="ml-2 text-[11px] font-medium text-slate-500">
                              (Composition: {medResult.medication.genericName})
                            </span>
                          )}
                        </div>

                        <Badge tone={hasAlts ? "green" : "neutral"}>
                          {hasAlts ? `${medResult.alternatives.length} Option(s)` : "No Alternative Found"}
                        </Badge>
                      </div>

                      {!hasAlts ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {medResult.message || "No validated generic alternative found for this active ingredient formula in database catalog."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {medResult.alternatives.map((alt, aIdx) => (
                            <div
                              key={aIdx}
                              className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {alt.brandName}
                                  {alt.isGeneric && (
                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      JAN AUSHADHI GENERIC
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                                  {alt.matchType.replace(/_/g, " ")}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-3 text-[10px] text-slate-600 dark:text-slate-400">
                                <span>Strength: <strong>{alt.strength}</strong></span>
                                <span>Form: <strong>{alt.dosageForm}</strong></span>
                                <span>Mfr: <strong>{alt.manufacturer}</strong></span>
                              </div>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{alt.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: UNVERIFIED ITEMS NOTICE IF PRESENT */}
          {(() => {
            const reviewItems = (unverifiedItems || []).filter(
              (item) => item && (item.requiresReview === true || item.status === "MEDICINE_NEEDS_REVIEW" || item.status === "MEDICINE_UNKNOWN")
            );
            if (reviewItems.length === 0) return null;
            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/30 space-y-1.5 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Unverified Medicines Requiring Review (
                  {reviewItems.length})
                </span>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {reviewItems.map((uItem, uIdx) => (
                    <div key={uIdx} className="rounded-lg bg-white p-2 text-[11px] border border-amber-200 dark:bg-slate-900 dark:border-slate-800">
                      <p className="font-bold text-slate-800 dark:text-slate-200">"{uItem.name}"</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">{uItem.reason}</p>
                      {uItem.sources && uItem.sources.length > 0 && (
                        <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                          📄 Source: {uItem.sources.map((s: any) => s.fileName).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* SECTION 5: CLINICAL SAFETY DISCLAIMER */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            <strong>Clinical Safety Disclaimer:</strong> {disclaimer}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
