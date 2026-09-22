"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Plus,
  Trash2,
  X,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { MedicalReport, PrescriptionExtraction, MedicationItem, MedicineCandidate } from "@/types";
import { api } from "@/lib/api";
import { PrescriptionSafetyCard, type InteractionCheckResponse } from "@/components/dashboard/PrescriptionSafetyCard";

interface PrescriptionReviewModalProps {
  report: MedicalReport | null;
  extraction: PrescriptionExtraction | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export function PrescriptionReviewModal({
  report,
  extraction,
  onClose,
  onConfirmed,
}: PrescriptionReviewModalProps) {
  const [data, setData] = useState<PrescriptionExtraction>(() => {
    return (
      extraction ||
      report?.extractedData || {
        patient: { name: "", age: "", gender: "", date: "" },
        doctor: { name: "", hospital: "", licenseNumber: "" },
        medications: [],
        diagnoses: [],
        summary: "",
      }
    );
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [interactionResult, setInteractionResult] = useState<InteractionCheckResponse | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);

  useEffect(() => {
    if (data.medications && data.medications.length > 0) {
      setInteractionLoading(true);
      api<InteractionCheckResponse>("/interactions/check", {
        method: "POST",
        body: JSON.stringify({ medications: data.medications }),
      })
        .then((res) => setInteractionResult(res))
        .catch(() => setInteractionResult(null))
        .finally(() => setInteractionLoading(false));
    }
  }, [data.medications]);

  if (!report) return null;

  const fileUrl = report.reportUrl || report.fileUrl || "";
  const isPdf = fileUrl.toLowerCase().includes(".pdf");

  const handleMedChange = (index: number, field: keyof MedicationItem, val: any) => {
    setData((prev) => {
      const updated = [...(prev.medications || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, medications: updated };
    });
  };

  const handleSelectCandidate = (index: number, candidate: MedicineCandidate) => {
    setData((prev) => {
      const updated = [...(prev.medications || [])];
      updated[index] = {
        ...updated[index],
        brandName: candidate.brandName || candidate.name,
        genericName: candidate.genericName || "",
        medicineName: candidate.brandName || candidate.name,
        activeIngredients: candidate.activeIngredients || [],
        strength: candidate.strength || updated[index].strength || "",
        dosageForm: candidate.dosageForm || updated[index].dosageForm || "",
        rxNormCui: candidate.rxNormCui || "",
        confidence: candidate.confidence,
        status: "verified_by_user",
        needsReview: false,
      };
      return { ...prev, medications: updated };
    });
  };

  const handleMarkUnreadable = (index: number) => {
    setData((prev) => {
      const updated = [...(prev.medications || [])];
      updated[index] = {
        ...updated[index],
        brandName: "Unreadable",
        medicineName: "Unreadable",
        status: "unresolved",
        needsReview: false,
      };
      return { ...prev, medications: updated };
    });
  };

  const handleAddMed = () => {
    setData((prev) => ({
      ...prev,
      medications: [
        ...(prev.medications || []),
        {
          rawText: "Manually entered",
          brandName: "",
          genericName: "",
          medicineName: "",
          dose: "1 tablet",
          frequency: "OD",
          frequencyInterpreted: "once daily",
          duration: "5 days",
          confidence: 1.0,
          status: "verified_by_user",
          needsReview: false,
        },
      ],
    }));
  };

  const handleRemoveMed = (index: number) => {
    setData((prev) => ({
      ...prev,
      medications: (prev.medications || []).filter((_, i) => i !== index),
    }));
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    try {
      const reportId = report.id || report._id;
      await api(`/uploads/reports/${reportId}/confirm`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      onConfirmed();
    } catch (err: any) {
      setError(err.message || "Failed to confirm extraction");
    } finally {
      setSaving(false);
    }
  };

  const overallConf = Math.round((data.overallConfidence || 0.85) * 100);
  const hasUncertainMeds = data.medications?.some((m) => m.status === "needs_review" || m.status === "unresolved" || !m.brandName);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Medicine-Aware Prescription Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select matched candidate medicines or edit fields before saving to history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  hasUncertainMeds
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                {hasUncertainMeds ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Extraction Confidence: {overallConf}% {hasUncertainMeds ? "(Verification Required)" : "(High)"}
              </span>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {hasUncertainMeds && (
            <div className="flex items-center gap-3 bg-amber-50 px-6 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Verification Required:</strong> Handwritten entries are matched against our Indian & RxNorm drug database. Please select candidate matches or edit items marked yellow.
              </span>
            </div>
          )}

          {/* Main Content Body */}
          <div className="grid flex-1 overflow-hidden lg:grid-cols-12">
            {/* Left Column: Original Document */}
            <div className="flex flex-col border-b border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950/70 lg:col-span-5 lg:border-b-0 lg:border-r">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> Original Prescription Document
                </span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  <Download className="h-3.5 w-3.5" /> Open File
                </a>
              </div>

              <div className="relative flex-1 overflow-auto rounded-2xl bg-white p-2 shadow-inner ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 min-h-[300px]">
                {isPdf ? (
                  <iframe src={fileUrl} className="h-full w-full rounded-xl" title="Original PDF Document" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl} alt="Original Prescription" className="mx-auto h-auto max-h-[58vh] w-auto object-contain rounded-lg" />
                )}
              </div>
            </div>

            {/* Right Column: Candidates & Verification Form */}
            <div className="flex flex-col overflow-y-auto p-6 lg:col-span-7 space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Patient & Doctor Header Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Patient Info</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block text-[10px]">Patient Name</label>
                      <input
                        type="text"
                        value={data.patient?.name || ""}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            patient: { ...(prev.patient || {}), name: e.target.value },
                          }))
                        }
                        placeholder="Unspecified"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">Date</label>
                      <input
                        type="text"
                        value={data.patient?.date || ""}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            patient: { ...(prev.patient || {}), date: e.target.value },
                          }))
                        }
                        placeholder="Date"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Prescribing Doctor</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block text-[10px]">Doctor Name</label>
                      <input
                        type="text"
                        value={data.doctor?.name || ""}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            doctor: { ...(prev.doctor || {}), name: e.target.value },
                          }))
                        }
                        placeholder="Dr. Name"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">Hospital / Clinic</label>
                      <input
                        type="text"
                        value={data.doctor?.hospital || ""}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            doctor: { ...(prev.doctor || {}), hospital: e.target.value },
                          }))
                        }
                        placeholder="Clinic Name"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Medication Line Items & Candidate Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Detected Prescription Lines ({data.medications?.length || 0})
                  </h3>
                  <button
                    onClick={handleAddMed}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Medication
                  </button>
                </div>

                {(!data.medications || data.medications.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                    No medications detected. Click "Add Medication" to manually enter prescription items.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.medications.map((med, idx) => {
                      const isUncertain = med.status === "needs_review" || med.status === "unresolved" || !med.brandName;
                      const brandName = med.brandName || med.medicineName || "";
                      const genericName = med.genericName || "";

                      return (
                        <div
                          key={idx}
                          className={`group relative rounded-2xl border p-4 transition-all ${
                            isUncertain
                              ? "border-amber-300 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/20"
                              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                              Line #{idx + 1} {med.rawText && `· Handwriting: "${med.rawText}"`}
                            </span>

                            <div className="flex items-center gap-2">
                              {isUncertain ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  Verification Needed
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  Verified
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveMed(idx)}
                                className="text-slate-400 hover:text-rose-500"
                                title="Remove line item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Selected Brand & Generic Resolution */}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                Prescribed Brand Name
                              </label>
                              <input
                                type="text"
                                value={brandName}
                                onChange={(e) => {
                                  handleMedChange(idx, "brandName", e.target.value);
                                  handleMedChange(idx, "medicineName", e.target.value);
                                }}
                                placeholder="e.g. Glycomet 500"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                                <span>Generic / Active Ingredient</span>
                                {med.rxNormCui && (
                                  <span className="text-[9px] font-normal text-brand-600 dark:text-brand-400">
                                    RxCUI: {med.rxNormCui}
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={genericName}
                                onChange={(e) => handleMedChange(idx, "genericName", e.target.value)}
                                placeholder="e.g. Metformin"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                              />
                            </div>
                          </div>

                          {/* Candidate Selector Cards */}
                          {med.candidates && med.candidates.length > 0 && (
                            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <HelpCircle className="h-3 w-3 text-brand-500" /> Database Candidate Matches for "{med.rawText || brandName}":
                              </span>

                              <div className="grid gap-2 sm:grid-cols-2">
                                {med.candidates.map((cand, cIdx) => {
                                  const confPct = Math.round(cand.confidence * 100);
                                  return (
                                    <div
                                      key={cIdx}
                                      className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-xs transition-all hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1 font-bold text-slate-800 dark:text-slate-100">
                                          <span className="truncate">{cand.brandName || cand.name}</span>
                                          <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                                            {confPct}% match
                                          </span>
                                        </div>
                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                          Generic: {cand.genericName} {cand.strength ? `· ${cand.strength}` : ""}
                                        </p>
                                        {cand.source && (
                                          <p className="text-[9px] text-slate-400 italic">Source: {cand.source}</p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectCandidate(idx, cand)}
                                        className="mt-2 flex items-center justify-center gap-1 rounded-md bg-brand-50 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
                                      >
                                        Select Candidate <ChevronRight className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleMarkUnreadable(idx)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-rose-500 underline"
                                >
                                  Mark as Unreadable
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dosage, Frequency, Duration grid */}
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                            <div>
                              <label className="text-[10px] text-slate-400">Dose</label>
                              <input
                                type="text"
                                value={med.dose || med.dosage || ""}
                                onChange={(e) => handleMedChange(idx, "dose", e.target.value)}
                                placeholder="1 tablet"
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Frequency Code</label>
                              <input
                                type="text"
                                value={med.frequency || ""}
                                onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                                placeholder="OD / BD / TDS"
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Interpreted Meaning</label>
                              <input
                                type="text"
                                value={med.frequencyInterpreted || ""}
                                onChange={(e) => handleMedChange(idx, "frequencyInterpreted", e.target.value)}
                                placeholder="Twice daily"
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400">Duration</label>
                              <input
                                type="text"
                                value={med.duration || ""}
                                onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                                placeholder="5 days"
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drug-Drug Interaction Safety Card */}
              <div className="mt-4">
                <PrescriptionSafetyCard checkResult={interactionResult} loading={interactionLoading} />
              </div>

              {/* Summary / Notes */}
              {data.summary && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Clinical Summary</label>
                  <textarea
                    value={data.summary}
                    onChange={(e) => setData((prev) => ({ ...prev, summary: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <span className="text-xs text-slate-400">
              Only user-confirmed medicines will be saved into your active health history.
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving Verified Medicines…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Save Verified Record
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
