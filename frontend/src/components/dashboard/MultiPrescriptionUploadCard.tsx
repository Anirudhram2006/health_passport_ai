"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Pill,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fileSize, cn } from "@/lib/utils";
import { PrescriptionSafetyCard, type InteractionCheckResponse } from "@/components/dashboard/PrescriptionSafetyCard";
import type { MedicalReport, PrescriptionExtraction } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PrescriptionQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: "pdf" | "image";
  status: "waiting" | "uploading" | "ocr" | "done" | "failed";
  progressPct: number;
  report?: MedicalReport;
  extraction?: PrescriptionExtraction;
  error?: string;
}

interface MultiPrescriptionUploadCardProps {
  onAnalysisComplete?: (result: InteractionCheckResponse, prescriptions: PrescriptionQueueItem[]) => void;
}

export function MultiPrescriptionUploadCard({ onAnalysisComplete }: MultiPrescriptionUploadCardProps) {
  const [queue, setQueue] = useState<PrescriptionQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionCheckResponse | null>(null);
  const [analyzingInteractions, setAnalyzingInteractions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((f) =>
      ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (!validFiles.length) return;

    const newItems: PrescriptionQueueItem[] = validFiles.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${f.name}`,
      file: f,
      name: f.name,
      size: f.size,
      kind: f.type === "application/pdf" ? "pdf" : "image",
      status: "waiting",
      progressPct: 0,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setInteractionResult(null);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setInteractionResult(null);
  };

  const processSingleFile = async (item: PrescriptionQueueItem): Promise<PrescriptionQueueItem> => {
    try {
      // 1. Uploading State
      setQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", progressPct: 30, error: undefined } : it))
      );

      const token = typeof window !== "undefined" ? localStorage.getItem("hpa_token") : null;
      const form = new FormData();
      form.append("file", item.file);

      // 2. OCR State
      setQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "ocr", progressPct: 70 } : it))
      );

      const res = await fetch(`${API_URL}/uploads/report`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Prescription extraction failed");

      // 3. Completed State
      const updatedItem: PrescriptionQueueItem = {
        ...item,
        status: "done",
        progressPct: 100,
        report: data.report,
        extraction: data.extraction || data.report?.extractedData,
      };

      setQueue((prev) => prev.map((it) => (it.id === item.id ? updatedItem : it)));
      return updatedItem;
    } catch (err: any) {
      const failedItem: PrescriptionQueueItem = {
        ...item,
        status: "failed",
        progressPct: 0,
        error: err.message || "Failed to process prescription",
      };
      setQueue((prev) => prev.map((it) => (it.id === item.id ? failedItem : it)));
      return failedItem;
    }
  };

  const handleAnalyzeAll = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);
    setInteractionResult(null);

    const processedItems: PrescriptionQueueItem[] = [];

    // Process files independently
    for (const item of queue) {
      if (item.status === "done" && item.report) {
        processedItems.push(item);
      } else {
        const res = await processSingleFile(item);
        processedItems.push(res);
      }
    }

    setIsProcessing(false);

    // Filter successfully extracted prescriptions
    const successfulItems = processedItems.filter((it) => it.status === "done" && (it.extraction || it.report));
    if (successfulItems.length === 0) return;

    // Trigger cross-prescription interaction check
    setAnalyzingInteractions(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("hpa_token") : null;
      const payload = {
        prescriptions: successfulItems.map((it) => ({
          prescriptionId: it.report?.id || it.report?._id || it.id,
          fileName: it.name,
          medications: it.extraction?.medications || it.report?.extractedData?.medications || (it.report as any)?.extractedEntities?.medications || [],
        })),
      };

      const res = await fetch(`${API_URL}/interactions/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setInteractionResult(data);
      if (onAnalysisComplete) onAnalysisComplete(data, processedItems);
    } catch (err) {
      console.error("Multi-prescription interaction error:", err);
    } finally {
      setAnalyzingInteractions(false);
    }
  };

  const completedCount = queue.filter((i) => i.status === "done").length;
  const failedCount = queue.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-brand-500" />
              Multiple Prescription Upload &amp; Interaction Detector
            </CardTitle>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus className="h-4 w-4 text-brand-500" />
                Add Prescriptions
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) handleAddFiles(files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Dropzone area */}
          {queue.length === 0 && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                if (files.length) handleAddFiles(files);
              }}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
            >
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Select or drag &amp; drop multiple prescriptions
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Supports PDF, JPG, PNG up to 10 MB per file. Upload multiple files at once to detect cross-prescription interactions.
              </p>
            </div>
          )}

          {/* Selected File Queue */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Selected Prescriptions ({queue.length})</span>
                <span>
                  {completedCount} Completed · {failedCount} Failed
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {queue.map((item, idx) => {
                  const medsFound = item.extraction?.medications?.length ?? item.report?.extractedData?.medications?.length ?? (item.report as any)?.extractedEntities?.medications?.length ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-2xl border p-3.5 transition-all text-xs",
                        item.status === "failed"
                          ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20"
                          : item.status === "done"
                          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-400 font-bold">
                            {item.kind === "pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-slate-900 dark:text-white">
                              {idx + 1}. {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {fileSize(item.size)} · {item.kind.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === "done" && (
                            <Badge tone="green">
                              <CheckCircle2 className="h-3 w-3" /> {medsFound} Meds
                            </Badge>
                          )}
                          {item.status === "failed" && <Badge tone="rose">Failed</Badge>}
                          {(item.status === "uploading" || item.status === "ocr") && (
                            <span className="flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400 text-[11px]">
                              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {item.status === "uploading" ? "Uploading…" : "OCR Processing…"}
                            </span>
                          )}

                          {item.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => processSingleFile(item)}
                              disabled={isProcessing}
                              className="text-rose-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                            >
                              <RefreshCw className="h-3 w-3" /> Retry
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isProcessing}
                            className="text-slate-400 hover:text-rose-500 p-1"
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Error Banner */}
                      {item.error && (
                        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {item.error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isProcessing}
                  className="btn-secondary !py-2 text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add More Prescriptions
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeAll}
                  disabled={isProcessing || analyzingInteractions || queue.length === 0}
                  className="btn-primary !py-2.5 px-6 text-xs font-extrabold flex items-center gap-2 shadow-md"
                >
                  {isProcessing || analyzingInteractions ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Evaluating Cross-Prescription Interactions…
                    </>
                  ) : (
                    <>
                      <Pill className="h-4 w-4" />
                      Analyze All Prescriptions &amp; Interactions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-Prescription Drug Interaction Analysis Card */}
      {(analyzingInteractions || interactionResult) && (
        <PrescriptionSafetyCard checkResult={interactionResult} loading={analyzingInteractions} />
      )}
    </div>
  );
}
