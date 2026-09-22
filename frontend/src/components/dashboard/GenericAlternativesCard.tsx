"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Pill, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface AlternativeItem {
  name: string;
  brandName: string;
  genericName: string;
  activeIngredients: string[];
  strength: string;
  dosageForm: string;
  manufacturer: string;
  isGeneric: boolean;
  matchType:
    | "EXACT_GENERIC_EQUIVALENT"
    | "COMBINATION_EQUIVALENT"
    | "SAME_ACTIVE_INGREDIENT_DIFFERENT_STRENGTH"
    | "SAME_ACTIVE_INGREDIENT_DIFFERENT_DOSAGE_FORM"
    | "NO_VALIDATED_ALTERNATIVE";
  matchScore: number;
  source: string;
  verified: boolean;
  explanation: string;
}

export interface GenericAlternativesResponse {
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
    sources?: any[];
  };
  alternatives: AlternativeItem[];
  disclaimer: string;
}

interface GenericAlternativesCardProps {
  alternativesResult: GenericAlternativesResponse | null;
  loading?: boolean;
  onClose?: () => void;
}

export function GenericAlternativesCard({ alternativesResult, loading, onClose }: GenericAlternativesCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className="animate-pulse border-brand-200 bg-brand-50/20 dark:border-brand-900/30 dark:bg-brand-950/10">
        <CardContent className="p-5 text-center text-xs font-medium text-slate-500">
          Searching validated database for generic alternatives based on active ingredient composition…
        </CardContent>
      </Card>
    );
  }

  if (!alternativesResult) return null;

  const { status, message, medication, alternatives, disclaimer } = alternativesResult;

  const hasAlternatives = status === "ALTERNATIVES_FOUND" && alternatives.length > 0;

  return (
    <Card className="overflow-hidden border-brand-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="py-3.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Pill className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Generic Alternatives &amp; Options: <span className="text-brand-600 dark:text-brand-400">{medication.name}</span>
          </CardTitle>

          <div className="flex items-center gap-2">
            {hasAlternatives ? (
              <Badge tone="green">{alternatives.length} Generic Option(s) Available</Badge>
            ) : status === "NO_VALIDATED_ALTERNATIVE" ? (
              <Badge tone="neutral">No Validated Alternative</Badge>
            ) : (
              <Badge tone="amber">Verification Required</Badge>
            )}

            {onClose && (
              <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            )}

            <button className="text-slate-400" onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 p-4 pt-3">
          {/* Target Medication Context Header */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs dark:border-brand-900/40 dark:bg-brand-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
                  Prescribed Medication
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{medication.name}</h4>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                {medication.genericName && (
                  <span className="rounded-md bg-white px-2 py-0.5 shadow-2xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Active Ingredient: <strong>{medication.genericName}</strong>
                  </span>
                )}
                {medication.strength && (
                  <span className="rounded-md bg-white px-2 py-0.5 shadow-2xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Strength: <strong>{medication.strength}</strong>
                  </span>
                )}
                {medication.dosageForm && (
                  <span className="rounded-md bg-white px-2 py-0.5 shadow-2xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Form: <strong>{medication.dosageForm}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Message Banners */}
          {status === "NO_VALIDATED_ALTERNATIVE" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 p-3 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
              <div>
                <p className="font-bold">{message}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  No validated generic alternative matching this formula is registered in the configured database catalog.
                </p>
              </div>
            </div>
          )}

          {status === "MEDICINE_UNVERIFIED" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-100/60 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">{message}</p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  Please verify ambiguous handwriting in the prescription before searching for generic options.
                </p>
              </div>
            </div>
          )}

          {status === "DATABASE_UNAVAILABLE" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-100/60 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">{message}</p>
                <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">
                  The medicine catalog lookup service is temporarily unreachable. Please try again later.
                </p>
              </div>
            </div>
          )}

          {/* Validated Alternatives List */}
          {hasAlternatives && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Verified Generic Options ({alternatives.length})
                </h4>
                <span className="text-[10px] text-slate-500">Sorted by ingredient equivalence &amp; generic availability</span>
              </div>

              <div className="space-y-2.5">
                {alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          {alt.brandName}
                          {alt.isGeneric && (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              GENERIC
                            </span>
                          )}
                        </span>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Composition: <strong>{alt.genericName}</strong>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          alt.matchType === "EXACT_GENERIC_EQUIVALENT" || alt.matchType === "COMBINATION_EQUIVALENT"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {alt.matchType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        Strength: <strong className="text-slate-900 dark:text-white">{alt.strength}</strong>
                      </div>
                      <div>
                        Dosage Form: <strong className="text-slate-900 dark:text-white">{alt.dosageForm}</strong>
                      </div>
                      <div>
                        Manufacturer: <strong className="text-slate-900 dark:text-white">{alt.manufacturer}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{alt.explanation}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400 dark:border-slate-800">
                      <span>Source Dataset: <strong>{alt.source}</strong></span>
                      <span className="text-brand-600 dark:text-brand-400 font-bold">View Generic Options Only</span>
                    </div>
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
