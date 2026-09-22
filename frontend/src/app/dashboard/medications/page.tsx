"use client";

import { useState, useEffect } from "react";
import {
  BellRing,
  Clock,
  Plus,
  Pill,
  Trash2,
  Search,
  Filter,
  ShieldCheck,
  HeartPulse,
  Copy,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AppShell, patientNav } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { PrescriptionSafetyCard, type InteractionCheckResponse } from "@/components/dashboard/PrescriptionSafetyCard";
import { DrugConditionSafetyCard, type DrugConditionCheckResponse } from "@/components/dashboard/DrugConditionSafetyCard";
import { DuplicateDrugSafetyCard, type DuplicateCheckResponse } from "@/components/dashboard/DuplicateDrugSafetyCard";
import { GenericAlternativesCard, type GenericAlternativesResponse } from "@/components/dashboard/GenericAlternativesCard";
import { usePatientHome } from "@/lib/use-patient";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type ActiveTab = "meds" | "drug-drug" | "drug-condition" | "duplicates" | "generics";

export default function MedicationsPage() {
  const { data, loading, refetch } = usePatientHome();
  const [activeTab, setActiveTab] = useState<ActiveTab>("meds");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Safety module state
  const [interactionResult, setInteractionResult] = useState<InteractionCheckResponse | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [dcResult, setDcResult] = useState<DrugConditionCheckResponse | null>(null);
  const [dcLoading, setDcLoading] = useState(false);
  const [dupResult, setDupResult] = useState<DuplicateCheckResponse | null>(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [altResult, setAltResult] = useState<GenericAlternativesResponse | null>(null);
  const [altLoading, setAltLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "drug-drug" && !interactionResult && data?.patient?.medications) {
      const activeMeds = data.patient.medications.filter((m: any) => m.active !== false);
      if (activeMeds.length > 0) {
        setInteractionLoading(true);
        api<InteractionCheckResponse>("/interactions/check", {
          method: "POST",
          body: JSON.stringify({ medications: activeMeds }),
        })
          .then((res) => setInteractionResult(res))
          .catch(() => setInteractionResult(null))
          .finally(() => setInteractionLoading(false));
      }
    } else if (activeTab === "drug-condition" && !dcResult) {
      setDcLoading(true);
      api<DrugConditionCheckResponse>("/interactions/check-drug-condition", {
        method: "POST",
        body: JSON.stringify({}),
      })
        .then((res) => setDcResult(res))
        .catch(() => setDcResult(null))
        .finally(() => setDcLoading(false));
    } else if (activeTab === "duplicates" && !dupResult) {
      setDupLoading(true);
      api<DuplicateCheckResponse>("/interactions/check-duplicates", {
        method: "POST",
        body: JSON.stringify({}),
      })
        .then((res) => setDupResult(res))
        .catch(() => setDupResult(null))
        .finally(() => setDupLoading(false));
    } else if (activeTab === "generics" && !altResult && data?.patient?.medications?.[0]) {
      const targetMed = data.patient.medications[0];
      setAltLoading(true);
      api<GenericAlternativesResponse>("/interactions/generic-alternatives", {
        method: "POST",
        body: JSON.stringify({ medication: targetMed }),
      })
        .then((res) => setAltResult(res))
        .catch(() => setAltResult(null))
        .finally(() => setAltLoading(false));
    }
  }, [activeTab, data?.patient?.medications, interactionResult, dcResult, dupResult, altResult]);

  const addMed = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const newMed = {
        name: name || "New Medication",
        dosage: dosage || "—",
        frequency,
        prescribedBy: "Self-tracked",
        startDate: new Date().toISOString(),
        active: true,
      };
      const medications = [
        ...data.patient.medications.map((m) => ({
          _id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          prescribedBy: m.prescribedBy,
          startDate: m.startDate,
          active: m.active,
        })),
        newMed,
      ];
      await api("/patients/me", {
        method: "PATCH",
        body: JSON.stringify({ medications }),
      });
      await refetch();
      setName("");
      setDosage("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save medication");
    } finally {
      setSaving(false);
    }
  };

  const removeMed = async (id: string) => {
    if (!data) return;
    try {
      const medications = data.patient.medications
        .filter((m) => m.id !== id)
        .map((m) => ({
          _id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          prescribedBy: m.prescribedBy,
          startDate: m.startDate,
          active: m.active,
        }));
      await api("/patients/me", {
        method: "PATCH",
        body: JSON.stringify({ medications }),
      });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete medication");
    }
  };

  const toggleReminder = (id: string) => {
    setReminders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading || !data) {
    return (
      <AppShell navItems={patientNav} accent="brand">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const allMeds = data.patient.medications || [];

  const filteredMeds = allMeds.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === "active") return matchesSearch && m.active !== false;
    if (filterStatus === "inactive") return matchesSearch && m.active === false;
    return matchesSearch;
  });

  return (
    <AppShell navItems={patientNav} accent="brand">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Medication &amp; Safety Hub
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage prescribed drugs, dosage schedules, drug-drug interactions, duplicate detection, and generic options.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} size="md">
            <Plus className="h-4 w-4" />
            Add Medication
          </Button>
        </div>

        {/* Clinical Safety Sub-Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 space-x-1 pb-1">
          {[
            { id: "meds", label: `My Medications (${allMeds.length})`, icon: Pill },
            { id: "drug-drug", label: "Drug–Drug Interactions", icon: ShieldCheck },
            { id: "drug-condition", label: "Drug–Condition", icon: HeartPulse },
            { id: "duplicates", label: "Duplicate Drugs", icon: Copy },
            { id: "generics", label: "Generic Options", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                  active
                    ? "border-brand-600 bg-brand-50/50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300"
                    : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* TAB 1: ALL MEDICATIONS (Clinical Table Layout) */}
        {activeTab === "meds" && (
          <div className="space-y-4">
            {/* Filter Controls & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medication by name…"
                  className="input-base !py-2 pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto">
                {(["all", "active", "inactive"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-colors ${
                      filterStatus === st
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredMeds.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <Pill className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No medications found</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                  {search ? "No medication matches your search criteria." : "Add a medication record to begin tracking."}
                </p>
                <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Medication
                </Button>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/80 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Medication / Formula</th>
                        <th className="px-4 py-3">Dosage &amp; Strength</th>
                        <th className="px-4 py-3">Frequency</th>
                        <th className="px-4 py-3">Prescribed By</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredMeds.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                <Pill className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                                {m.genericName && m.genericName !== m.name && (
                                  <p className="text-[11px] text-slate-400">Generic: {m.genericName}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            {m.dosage || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                            {m.frequency}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {m.prescribedBy || "Prescription"}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge tone={m.active !== false ? "green" : "neutral"}>
                              {m.active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleReminder(m.id)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  reminders[m.id] ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                                title={reminders[m.id] ? "Reminder Active" : "Set Reminder"}
                              >
                                <BellRing className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeMed(m.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                title="Delete medication"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: DRUG–DRUG INTERACTIONS */}
        {activeTab === "drug-drug" && (
          <PrescriptionSafetyCard checkResult={interactionResult} loading={interactionLoading} />
        )}

        {/* TAB 3: DRUG–CONDITION INTERACTIONS */}
        {activeTab === "drug-condition" && (
          <DrugConditionSafetyCard checkResult={dcResult} loading={dcLoading} />
        )}

        {/* TAB 4: DUPLICATE DRUGS */}
        {activeTab === "duplicates" && (
          <DuplicateDrugSafetyCard duplicateResult={dupResult} loading={dupLoading} />
        )}

        {/* TAB 5: GENERIC ALTERNATIVES */}
        {activeTab === "generics" && (
          <GenericAlternativesCard alternativesResult={altResult} loading={altLoading} />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Medication Record">
        <div className="space-y-4">
          <Field label="Medication Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol or Dolo 650" />
          </Field>
          <Field label="Dosage & Strength">
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 650 mg (1 tablet)" />
          </Field>
          <Field label="Frequency">
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              options={["Once daily", "Twice daily", "Thrice daily", "Once weekly", "As needed"].map((o) => ({ value: o, label: o }))}
            />
          </Field>
          <Button onClick={addMed} className="w-full" loading={saving}>
            <Plus className="h-4 w-4" />
            Save Medication
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
