/**
 * Patient Medical History Synchronization & Multi-Report Aggregator Engine (Module 11)
 * Aggregates multi-report patient records, deduplicates active medications, and builds timeline.
 */

function aggregatePatientHistory(patient, reports = []) {
  if (!patient) return null;

  // 1. Collect all medications from patient profile + reports
  const medicationMap = new Map();

  // Load existing profile medications
  (patient.medications || []).forEach((med) => {
    const key = (med.name || med.brandName || med.genericName || "").toLowerCase().trim();
    if (key) {
      medicationMap.set(key, {
        name: med.name || med.brandName || key,
        brandName: med.brandName,
        genericName: med.genericName,
        dosage: med.dosage || "",
        frequency: med.frequency || "",
        prescribedBy: med.prescribedBy || "Primary Care Physician",
        active: med.active !== false,
        source: "Patient Profile",
        lastUpdated: med.startDate || patient.updatedAt,
      });
    }
  });

  // Extract additional medications mentioned in report text summaries
  reports.forEach((report) => {
    const text = `${report.title || ""} ${report.extracted || ""} ${report.aiSummary || ""}`;
    // Parse common dosage mentions e.g. "Metformin 500mg", "Amlodipine 5mg"
    const matches = text.matchAll(/([A-Z][a-z0-9\-]+(?:\s+[A-Z][a-z0-9\-]+)?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|ui))/gi);
    for (const match of matches) {
      const medName = match[1].trim();
      const dosage = match[2].trim();
      const key = medName.toLowerCase();
      // Exclude common clinical non-medication words
      if (/blood|glucose|hba1c|pressure|weight|height|pulse|doctor|hospital|report/i.test(key)) continue;

      if (!medicationMap.has(key)) {
        medicationMap.set(key, {
          name: `${medName} ${dosage}`,
          brandName: medName,
          dosage,
          frequency: "As prescribed",
          prescribedBy: report.doctor || "Consulting Specialist",
          active: true,
          source: `Report: ${report.title}`,
          lastUpdated: report.createdAt,
        });
      }
    }
  });

  const aggregatedMedications = Array.from(medicationMap.values());

  // 2. Build Chronological Medical Timeline
  const timeline = reports
    .map((rep) => ({
      id: rep._id ? rep._id.toString() : rep.id,
      title: rep.title || "Medical Report",
      type: rep.type || "Report",
      doctor: rep.doctor || "Staff Physician",
      hospital: rep.hospital || "Medical Facility",
      date: rep.createdAt ? new Date(rep.createdAt).toISOString() : new Date().toISOString(),
      summary: rep.aiSummary || rep.extracted || "Diagnostic records attached.",
      fileUrl: rep.fileUrl || "",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 3. Extract Lab Trend Indicators
  const labTrends = [];
  reports.forEach((rep) => {
    const text = rep.extracted || rep.aiSummary || "";
    const hba1c = text.match(/hba1c\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (hba1c) labTrends.push({ metric: "HbA1c", value: `${hba1c[1]}%`, date: rep.createdAt });

    const glucose = text.match(/glucose\s*[:=]?\s*(\d+)\s*mg\/dl/i);
    if (glucose) labTrends.push({ metric: "Fasting Glucose", value: `${glucose[1]} mg/dL`, date: rep.createdAt });
  });

  return {
    patientId: patient._id,
    passportId: patient.passportId,
    totalReportsCount: reports.length,
    aggregatedMedications,
    activeMedicationsCount: aggregatedMedications.filter((m) => m.active).length,
    timeline,
    labTrends,
    lastSynchronizedAt: new Date().toISOString(),
  };
}

module.exports = { aggregatePatientHistory };
