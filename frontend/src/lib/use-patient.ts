"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Appointment, MedicalReport, PatientProfile, TimelineEvent, HealthInsight } from "@/types";

export interface PatientHome {
  user: { id: string; name: string; email: string };
  patient: PatientProfile;
  reports: MedicalReport[];
  appointments: Appointment[];
}

export function mapPatient(patient: any, user?: any): PatientProfile {
  return {
    id: patient.passportId || user?.id || "",
    name: user?.name || "Patient",
    email: user?.email || "",
    phone: patient.phone || "",
    bloodGroup: patient.bloodGroup || "—",
    dob: patient.dob || "",
    height: patient.height || "—",
    weight: patient.weight || "—",
    allergies: (patient.allergies || []).map((a: any) => ({
      id: a._id || `${a.substance}`,
      substance: a.substance || "Unknown",
      severity: a.severity || "Mild",
      reaction: a.reaction || "",
    })),
    chronicDiseases: patient.chronicDiseases || [],
    emergencyContacts: (patient.emergencyContacts || []).map((c: any) => ({
      id: c._id || c.phone,
      name: c.name || "Contact",
      relation: c.relation || "",
      phone: c.phone || "",
    })),
    medications: (patient.medications || []).map((m: any) => ({
      id: m._id || `${m.name}`,
      name: m.name || "Medication",
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      prescribedBy: m.prescribedBy || "",
      startDate: m.startDate || "",
      active: m.active !== false,
    })),
    appointments: [],
    reports: [],
    healthScore: patient.healthScore ?? 0,
  };
}

export function mapReport(r: any): MedicalReport {
  return {
    id: r._id,
    title: r.title || r.fileName || "Report",
    type: r.type || "Lab Report",
    date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
    doctor: r.doctor || "",
    hospital: r.hospital || "",
    fileUrl: r.reportUrl || r.fileUrl || "",
    publicId: r.publicId || "",
    fileSize: r.fileSize || "",
    extracted: r.rawText || "",
    aiSummary: r.aiSummary || "",
  };
}

export function mapTimeline(reports: MedicalReport[]): TimelineEvent[] {
  return reports.map((r, i) => ({
    id: r.id || r._id || `report-${i}`,
    date: r.date || new Date().toISOString().slice(0, 10),
    type: r.type as TimelineEvent["type"],
    title: r.title,
    description: r.aiSummary || "",
    severity: i < 2 ? ("info" as const) : ("success" as const),
  }));
}

export function mapInsights(list: any[]): HealthInsight[] {
  return (list || []).map((i: any, idx: number) => ({
    id: `i${idx}`,
    icon: "trending",
    title: i.title || "Insight",
    detail: i.detail || i.summary || "",
    tone: i.tone || "positive",
  }));
}

let cache: PatientHome | null = null;

export function usePatientHome() {
  const [data, setData] = useState<PatientHome | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await api<any>("/patients/me");
      const patient = mapPatient(raw.patient, raw.user);
      const reports = (raw.reports || []).map(mapReport);
      const appointments: Appointment[] = (raw.appointments || []).map((a: any) => ({
        id: a._id,
        doctor: a.doctor || "",
        specialty: a.specialty || "",
        date: a.date ? new Date(a.date).toISOString().slice(0, 10) : "",
        time: a.time || "",
        location: a.location || "",
        status: a.status || "upcoming",
      }));
      const home: PatientHome = {
        user: raw.user || { id: "", name: "Patient", email: "" },
        patient: { ...patient, appointments, reports },
        reports,
        appointments,
      };
      cache = home;
      setData(home);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your health data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data) refetch();
  }, [data, refetch]);

  return { data, loading, error, refetch };
}

export async function deleteReport(id: string): Promise<void> {
  await api(`/uploads/reports/${id}`, { method: "DELETE" });
}

export async function fetchRiskAnalysis() {
  return await api<any>("/patients/me/risk-analysis");
}

export async function fetchPatientHistory() {
  return await api<any>("/patients/me/history");
}

