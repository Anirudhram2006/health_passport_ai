"use client";

import { ChevronLeft, ChevronRight, Download, Eye, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MedicalReport } from "@/types";

interface ReportViewerProps {
  report: MedicalReport | null;
  onClose: () => void;
}

function pageImageUrl(report: MedicalReport, page: number): string {
  const publicId = report.publicId;
  if (publicId) {
    const seg = `${publicId.split("/").map((s) => encodeURIComponent(s)).join("/")}`;
    return `https://res.cloudinary.com/r7kbt2da/image/upload/w_1200/f_png/pg_${page}/${seg}.png`;
  }
  const base = report.fileUrl.split("/image/upload/")[1] || "";
  const publicIdFromUrl = base.split("?")[0].replace(/^v\d+\//, "");
  return `https://res.cloudinary.com/r7kbt2da/image/upload/w_1200/f_png/pg_${page}/${publicIdFromUrl}`;
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [maxPage, setMaxPage] = useState(3);

  const src = report ? pageImageUrl(report, page) : "";

  useEffect(() => {
    setPage(1);
    setLoading(true);
    setImgError(false);
  }, [report]);

  const close = useCallback(() => {
    onClose();
    setPage(1);
    setLoading(true);
    setImgError(false);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setPage((p) => Math.min(maxPage, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    if (report) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [report, maxPage, close]);

  return (
    <AnimatePresence>
      {report && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={report.title}
        >
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{report.title}</h2>
                <p className="text-xs text-slate-400">
                  {report.type} · {report.date}
                  {report.fileSize ? ` · ${report.fileSize}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={report.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Original
                </a>
                <button
                  onClick={close}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-slate-100 p-5 dark:bg-slate-950/60">
              {imgError ? (
                <div className="grid h-full min-h-[50vh] place-items-center text-center">
                  <div>
                    <Eye className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Preview unavailable</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
                      The report file exists in secure storage but a preview couldn't be generated. You can still download
                      or open the original.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto w-fit">
                  <div
                    className={`mx-auto overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 ${loading ? "hidden" : "block"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={src}
                      src={src}
                      alt={`${report.title} page ${page}`}
                      className="max-h-[68vh] w-auto bg-white"
                      onLoad={() => setLoading(false)}
                      onError={() => {
                        setLoading(false);
                        setImgError(true);
                      }}
                    />
                  </div>
                  {loading && (
                    <div className="grid h-[50vh] w-72 place-items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Rendered securely from your record</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[3.5rem] text-center text-xs font-bold text-slate-500 dark:text-slate-300">
                  {page} / {maxPage}+
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(maxPage + 1, p + 1))}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
