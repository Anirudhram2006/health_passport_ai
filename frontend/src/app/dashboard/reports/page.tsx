"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Image,
  UploadCloud,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AppShell, patientNav } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { fileSize, cn } from "@/lib/utils";
import { PrescriptionReviewModal } from "@/components/dashboard/PrescriptionReviewModal";
import { MultiPrescriptionUploadCard } from "@/components/dashboard/MultiPrescriptionUploadCard";
import type { MedicalReport, PrescriptionExtraction } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Stage = "idle" | "uploading" | "ocr" | "ai" | "done";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  kind: "pdf" | "image";
}

function Dropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)
        );
        if (files.length) onFiles(files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Upload medical reports"
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
        dragging
          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30"
          : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600"
      )}
    >
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <UploadCloud className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        {dragging ? "Drop medical document here" : "Upload Medical Prescription or Lab Report"}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Drag & drop file or <span className="font-semibold text-brand-600 dark:text-brand-400">browse file</span> — PDF, JPG, PNG up to 10 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function WorkflowStepsProgress({ stage }: { stage: Stage }) {
  const steps = [
    { key: "uploading", label: "Uploading Document" },
    { key: "ocr", label: "Reading Prescription" },
    { key: "ai", label: "Reviewing Medications" },
    { key: "done", label: "Review Required" },
  ];

  const getStepIndex = (s: Stage) => {
    switch (s) {
      case "uploading": return 0;
      case "ocr": return 1;
      case "ai": return 2;
      case "done": return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(stage);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-brand-600 text-white animate-pulse"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <span className={`mt-1.5 text-[11px] font-medium text-center ${isCurrent ? "font-bold text-slate-900 dark:text-white" : "text-slate-400"}`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${idx < currentIndex ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UploadReportsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [extracted, setExtracted] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Modal Review state
  const [reviewReport, setReviewReport] = useState<MedicalReport | null>(null);
  const [reviewExtraction, setReviewExtraction] = useState<PrescriptionExtraction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const startUpload = async (list: File[]) => {
    const file = list[0];
    setError("");
    setSaved(false);
    setFiles([
      {
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        kind: file.type === "application/pdf" ? "pdf" : "image",
      },
    ]);
    setStage("uploading");

    try {
      const token = localStorage.getItem("hpa_token");
      const form = new FormData();
      form.append("file", file);

      setStage("ocr");

      const res = await fetch(`${API_URL}/uploads/report`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setStage("ai");
      await new Promise((r) => setTimeout(r, 600));

      setExtracted(data.rawText || "");
      setAiSummary(data.aiSummary?.summary || data.aiSummary || "");
      setReviewReport(data.report);
      setReviewExtraction(data.extraction || data.report?.extractedData || null);

      setStage("done");
      // Open verification modal
      setShowReviewModal(true);
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
  };

  const reset = () => {
    setFiles([]);
    setStage("idle");
    setExtracted("");
    setAiSummary("");
    setShowRawOcr(false);
    setError("");
    setSaved(false);
    setReviewReport(null);
    setReviewExtraction(null);
    setShowReviewModal(false);
  };

  const handleConfirmedSave = () => {
    setSaved(true);
    setShowReviewModal(false);
  };

  return (
    <AppShell navItems={patientNav} accent="brand">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Medical Reports & Prescriptions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload prescriptions or lab documents for clinical extraction and patient verification.
          </p>
        </div>

        <MultiPrescriptionUploadCard />

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Single Document Scanner</p>
          <Dropzone onFiles={(f) => startUpload(f)} disabled={stage === "uploading" || stage === "ocr" || stage === "ai"} />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {files.length > 0 && (stage === "uploading" || stage === "ocr" || stage === "ai") && (
          <Card className="p-5">
            <WorkflowStepsProgress stage={stage} />
            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                {files[0]?.kind === "pdf" ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{files[0]?.name}</p>
                <p className="text-[11px] text-slate-400">{fileSize(files[0]?.size || 0)}</p>
              </div>
            </div>
          </Card>
        )}

        {stage === "done" && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Processing Complete</h3>
              </div>
              <Badge tone={saved ? "green" : "amber"}>{saved ? "Verified & Saved" : "Confirmation Required"}</Badge>
            </div>

            {aiSummary && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider block">Summary Overview</span>
                <p className="leading-relaxed">{aiSummary}</p>
              </div>
            )}

            {extracted && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowRawOcr((prev) => !prev)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {showRawOcr ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showRawOcr ? "Hide Extracted Text" : "View Extracted Text"}
                </button>
                {showRawOcr && (
                  <pre className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {extracted}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
              <Button onClick={() => setShowReviewModal(true)} className="flex-1" size="md">
                <Edit3 className="h-4 w-4" />
                {saved ? "Review / Edit Saved Data" : "Review & Confirm Extracted Data"}
              </Button>
              <Button variant="secondary" onClick={reset} className="flex-1" size="md">
                Upload Another Document
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Review Side-by-Side Modal */}
      {showReviewModal && reviewReport && (
        <PrescriptionReviewModal
          report={reviewReport}
          extraction={reviewExtraction}
          onClose={() => setShowReviewModal(false)}
          onConfirmed={handleConfirmedSave}
        />
      )}
    </AppShell>
  );
}
