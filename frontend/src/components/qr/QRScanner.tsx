"use client";

import { Camera, ImagePlus, ScanLine, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onResult: (decodedText: string, token: string) => void;
  onError?: (error: string) => void;
  paused?: boolean;
  height?: number;
  width?: number;
}

export function parsePassportTokenFromScannedText(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const cleaned = text.trim();

  // Case 1: Scanned URL e.g. "http://192.168.1.5:3000/passport/hpa_tok_12345"
  if (cleaned.includes("/passport/")) {
    const parts = cleaned.split("/passport/");
    if (parts.length > 1) {
      const tokenCandidate = parts[1].split("?")[0].split("#")[0].trim();
      if (tokenCandidate) return tokenCandidate;
    }
  }

  // Case 2: Scanned JSON object e.g. {"token": "hpa_tok_123", "id": "HPA-2026-0001"}
  if (cleaned.startsWith("{")) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.token) return String(parsed.token).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch (e) {
      // ignore
    }
  }

  // Case 3: Direct token string e.g. "hpa_tok_12345" or "HPA-2026-0001"
  if (cleaned.length >= 4 && !cleaned.includes("<") && !cleaned.includes("function")) {
    return cleaned;
  }

  return null;
}

export function QRScanner({ onResult, onError, paused = false, height = 280, width = 280 }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [isNonSecureMobile, setIsNonSecureMobile] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [fileScanning, setFileScanning] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const secure = window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      setIsSecure(secure);
      if (!secure) {
        setIsNonSecureMobile(true);
      }
    }

    const id = "qr-live-scanner";
    let disposed = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        const scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;
        setStarting(true);

        // Try rear camera environment preference for smartphones
        await scanner
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
            (text) => {
              if (!handledRef.current && !disposed) {
                const token = parsePassportTokenFromScannedText(text);
                if (token) {
                  handledRef.current = true;
                  scanner.stop().catch(() => {});
                  onResult(text, token);
                } else {
                  onError?.("Invalid Health Passport QR Code");
                }
              }
            },
            () => {}
          )
          .catch(async () => {
            // Fallback to any available camera if environment preference fails
            if (disposed) return;
            const cameras = await Html5Qrcode.getCameras().catch(() => []);
            if (cameras.length > 0) {
              await scanner.start(
                cameras[0].id,
                { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
                (text) => {
                  if (!handledRef.current && !disposed) {
                    const token = parsePassportTokenFromScannedText(text);
                    if (token) {
                      handledRef.current = true;
                      scanner.stop().catch(() => {});
                      onResult(text, token);
                    }
                  }
                },
                () => {}
              );
            } else {
              throw new Error("No camera device found");
            }
          });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera unavailable";
        setError(msg);
        onError?.(msg);
      } finally {
        if (!disposed) setStarting(false);
      }
    };

    if (!paused) start();

    return () => {
      disposed = true;
      const s = scannerRef.current;
      if (s && s.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileScanning(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("qr-file-helper");
      const result = await html5QrCode.scanFileV2(file, true);
      if (result && result.decodedText) {
        const token = parsePassportTokenFromScannedText(result.decodedText);
        if (token) {
          onResult(result.decodedText, token);
        } else {
          setError("QR image decoded, but invalid Passport ID token format.");
        }
      } else {
        setError("Could not detect a clear QR code in this image.");
      }
    } catch (err) {
      setError("Failed to decode QR from image. Try another photo.");
    } finally {
      setFileScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode Indicator Badge */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-slate-400">Scanner Mode:</span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
            isSecure
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
          }`}
        >
          {isSecure ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" /> Secure (Camera Active)
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" /> HTTP LAN (Requires Ngrok or Upload)
            </>
          )}
        </span>
      </div>

      <div className="relative mx-auto overflow-hidden rounded-3xl bg-slate-900 ring-4 ring-brand-500/30" style={{ height, width }}>
        <div id="qr-live-scanner" className="[&>video]:!object-cover" />
        <div id="qr-file-helper" className="hidden" />

        {/* Corner brackets */}
        {["top-3 left-3 border-t-4 border-l-4 rounded-tl-xl", "top-3 right-3 border-t-4 border-r-4 rounded-tr-xl", "bottom-3 left-3 border-b-4 border-l-4 rounded-bl-xl", "bottom-3 right-3 border-b-4 border-r-4 rounded-br-xl"].map((c) => (
          <span key={c} className={`pointer-events-none absolute h-8 w-8 border-brand-400 ${c}`} />
        ))}

        <span className="scan-line" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-slate-900/90 to-transparent py-3 text-xs font-medium text-brand-200">
          <ScanLine className="h-4 w-4 animate-pulse" />
          {fileScanning ? "Decoding QR image..." : starting && !error ? "Starting camera…" : error ? "Camera unavailable" : "Align QR code within frame"}
        </div>

        {isNonSecureMobile && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center text-xs text-amber-200 space-y-2">
            <ShieldAlert className="h-8 w-8 text-amber-400 shrink-0" />
            <p className="font-bold text-white text-sm">Mobile Camera Notice</p>
            <p className="text-[11px] text-slate-300 leading-tight">
              Mobile browsers block WebRTC camera over plain HTTP LAN IPs.
            </p>
            <p className="text-[10px] text-amber-300">
              Use <span className="font-bold text-white">Upload QR Photo</span> below or access via <span className="font-bold text-emerald-400">Ngrok (HTTPS)</span>.
            </p>
          </div>
        )}

        {!isNonSecureMobile && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-6 text-center text-sm text-rose-300">
            <div>
              <X className="mx-auto mb-2 h-8 w-8 text-rose-400" />
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Upload QR Photo Button (Works 100% on HTTP mobile) */}
      <div className="flex justify-center pt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ImagePlus className="h-4 w-4 text-emerald-400" />
          Upload QR Image / Snap Photo
        </button>
      </div>
    </div>
  );
}

