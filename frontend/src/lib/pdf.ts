import { jsPDF } from "jspdf";
import type { PatientProfile, TimelineEvent, MedicalReport, HealthInsight } from "@/types";

/**
 * Unicode & Medical Symbol Sanitizer.
 * Converts symbols unsupported by default jsPDF fonts into safe readable ASCII text.
 */
function sanitizeMedicalText(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/°F/g, " deg F")
    .replace(/°C/g, " deg C")
    .replace(/°/g, " deg ")
    .replace(/µg/g, "mcg")
    .replace(/µ/g, "u")
    .replace(/±/g, "+/-")
    .replace(/SpO₂/g, "SpO2")
    .replace(/HbA1c/g, "HbA1c")
    .replace(/™/g, "")
    .replace(/®/g, "")
    .replace(/[^\x00-\x7F]/g, " ") // Replace non-ASCII printable chars with space
    .replace(/\s+/g, " ")
    .trim();
}

export function downloadPatientSummaryPDF(
  patient: PatientProfile,
  timeline: TimelineEvent[],
  reports: MedicalReport[] = [],
  insights: HealthInsight[] = []
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 48;
  const marginRight = 48;
  const marginTop = 40;
  const marginBottom = 55;
  const contentWidth = pageWidth - marginLeft - marginRight; // 499.28 pt

  let currentY = marginTop;

  // Header height offset for page breaks
  const headerBarHeight = 45;

  const drawPageHeader = () => {
    doc.setFillColor(8, 47, 73); // Slate 900
    doc.rect(0, 0, pageWidth, 36, "F");

    doc.setFillColor(20, 184, 166); // Teal 500 accent strip
    doc.rect(0, 36, pageWidth, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HEALTH PASSPORT AI", marginLeft, 23);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(186, 230, 253);
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    doc.text(`Patient Summary · ${dateStr}`, pageWidth - marginRight, 23, { align: "right" });
  };

  const ensureSpace = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      drawPageHeader();
      currentY = marginTop + headerBarHeight;
    }
  };

  // Initial first page header
  drawPageHeader();
  currentY += headerBarHeight + 5;

  // Render Title Card
  ensureSpace(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(sanitizeMedicalText(`Clinical Summary — ${patient.name || "Patient"}`), marginLeft, currentY);
  currentY += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(
    sanitizeMedicalText(`Patient ID: ${patient.id || "N/A"} · Blood Group: ${patient.bloodGroup || "Not available"}`),
    marginLeft,
    currentY
  );
  currentY += 22;

  const renderSectionHeader = (title: string) => {
    ensureSpace(35);
    doc.setFillColor(14, 165, 233); // Sky 500 accent
    doc.roundedRect(marginLeft, currentY, 6, 18, 2, 2, "F");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(sanitizeMedicalText(title), marginLeft + 14, currentY + 13);

    currentY += 26;
  };

  const renderKeyValue = (label: string, value: string | null | undefined, indent = 14) => {
    const safeVal = sanitizeMedicalText(value) || "Not available";
    doc.setFontSize(9);

    const wrappedLines = doc.splitTextToSize(safeVal, contentWidth - indent - 110);
    const itemHeight = Math.max(16, wrappedLines.length * 12 + 6);

    ensureSpace(itemHeight);

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text(sanitizeMedicalText(label), marginLeft + indent, currentY);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(wrappedLines, marginLeft + indent + 110, currentY);

    currentY += itemHeight;
  };

  // 1. Patient Vitals & Profile Information
  renderSectionHeader("Patient Information & Vitals");
  renderKeyValue("Full Name:", patient.name);
  renderKeyValue("Date of Birth:", patient.dob);
  renderKeyValue("Blood Group:", patient.bloodGroup);
  renderKeyValue("Height / Weight:", `${patient.height || "N/A"} / ${patient.weight || "N/A"}`);
  renderKeyValue("Phone / Contact:", patient.phone);
  currentY += 8;

  // 2. Clinical Overview & Gemini AI Insights
  if (insights.length > 0) {
    renderSectionHeader("Clinical Overview & AI Insights");
    insights.forEach((insight) => {
      const title = sanitizeMedicalText(insight.title);
      const detail = sanitizeMedicalText(insight.detail);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);

      const titleLines = doc.splitTextToSize(`* ${title}`, contentWidth - 14);
      const detailLines = doc.splitTextToSize(detail, contentWidth - 28);
      const blockHeight = (titleLines.length + detailLines.length) * 12 + 8;

      ensureSpace(blockHeight);

      doc.text(titleLines, marginLeft + 14, currentY);
      currentY += titleLines.length * 12 + 2;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(detailLines, marginLeft + 28, currentY);
      currentY += detailLines.length * 12 + 8;
    });
    currentY += 4;
  }

  // 3. Diagnoses & Chronic Conditions
  renderSectionHeader("Diagnoses & Chronic Conditions");
  if (patient.chronicDiseases && patient.chronicDiseases.length > 0) {
    patient.chronicDiseases.forEach((disease) => {
      renderKeyValue("Chronic Condition:", disease);
    });
  } else {
    renderKeyValue("Chronic Conditions:", "No chronic conditions recorded");
  }

  // Extract reports diagnoses if present
  const reportDiagnoses: string[] = [];
  reports.forEach((r) => {
    if (r.extractedData?.diagnoses && Array.isArray(r.extractedData.diagnoses)) {
      reportDiagnoses.push(...r.extractedData.diagnoses);
    }
  });
  if (reportDiagnoses.length > 0) {
    const uniqueDiag = Array.from(new Set(reportDiagnoses.map((d) => sanitizeMedicalText(d))));
    uniqueDiag.forEach((d) => renderKeyValue("Reported Diagnosis:", d));
  }
  currentY += 8;

  // 4. Allergies
  renderSectionHeader("Known Allergies & Sensitivities");
  if (patient.allergies && patient.allergies.length > 0) {
    patient.allergies.forEach((allergy) => {
      const desc = `${allergy.severity || "Moderate"} severity — ${allergy.reaction || "Allergic reaction"}`;
      renderKeyValue(`* ${allergy.substance}:`, desc);
    });
  } else {
    renderKeyValue("Allergies:", "No known drug or food allergies recorded");
  }
  currentY += 8;

  // 5. Active Medications Table
  renderSectionHeader("Current & Prescribed Medications");

  const activeMeds = patient.medications ? patient.medications.filter((m) => m.active !== false) : [];

  // Gather extracted report medications if available
  const reportMeds: any[] = [];
  reports.forEach((r) => {
    if (r.extractedData?.medications && Array.isArray(r.extractedData.medications)) {
      reportMeds.push(...r.extractedData.medications);
    }
  });

  if (activeMeds.length === 0 && reportMeds.length === 0) {
    renderKeyValue("Medications:", "No active medications recorded");
  } else {
    // Render Medication Table
    const colWidths = [140, 140, 110, 109.28];
    const headers = ["Medication / Brand", "Generic / Active Ingredient", "Dose & Frequency", "Duration / Status"];

    const drawTableHeader = () => {
      ensureSpace(24);
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(marginLeft, currentY, contentWidth, 20, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      let curX = marginLeft + 6;
      headers.forEach((h, i) => {
        doc.text(h, curX, currentY + 13);
        curX += colWidths[i];
      });

      currentY += 22;
    };

    drawTableHeader();

    const allMedList = [
      ...activeMeds.map((m) => ({
        brand: m.name,
        generic: m.name,
        dose: m.dosage || "As prescribed",
        freq: m.frequency || "Daily",
        duration: m.startDate ? `Since ${m.startDate}` : "Active",
      })),
      ...reportMeds.map((rm) => ({
        brand: rm.brandName || rm.medicineName || rm.rawText || "Prescription Item",
        generic: rm.genericName || rm.activeIngredients?.join(", ") || "Unspecified",
        dose: rm.dose || rm.strength || rm.dosage || "1 tablet",
        freq: rm.frequencyInterpreted || rm.frequency || "OD",
        duration: rm.duration || "Prescribed",
      })),
    ];

    // De-duplicate by brand name
    const seenMeds = new Set<string>();
    const uniqueMeds = allMedList.filter((m) => {
      const k = m.brand.toLowerCase();
      if (seenMeds.has(k)) return false;
      seenMeds.add(k);
      return true;
    });

    uniqueMeds.forEach((m) => {
      const col1 = doc.splitTextToSize(sanitizeMedicalText(m.brand) || "Not available", colWidths[0] - 10);
      const col2 = doc.splitTextToSize(sanitizeMedicalText(m.generic) || "Not available", colWidths[1] - 10);
      const col3 = doc.splitTextToSize(sanitizeMedicalText(`${m.dose}, ${m.freq}`) || "Not available", colWidths[2] - 10);
      const col4 = doc.splitTextToSize(sanitizeMedicalText(m.duration) || "Not available", colWidths[3] - 10);

      const maxLines = Math.max(col1.length, col2.length, col3.length, col4.length);
      const rowHeight = maxLines * 11 + 8;

      if (currentY + rowHeight > pageHeight - marginBottom) {
        doc.addPage();
        drawPageHeader();
        currentY = marginTop + headerBarHeight;
        drawTableHeader();
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      let curX = marginLeft + 6;
      doc.text(col1, curX, currentY + 10);
      curX += colWidths[0];

      doc.text(col2, curX, currentY + 10);
      curX += colWidths[1];

      doc.text(col3, curX, currentY + 10);
      curX += colWidths[2];

      doc.text(col4, curX, currentY + 10);

      doc.setDrawColor(226, 232, 240);
      doc.line(marginLeft, currentY + rowHeight - 2, marginLeft + contentWidth, currentY + rowHeight - 2);

      currentY += rowHeight;
    });
  }
  currentY += 8;

  // 6. Medical History & Timeline
  if (timeline.length > 0) {
    renderSectionHeader("Medical History & Timeline");
    timeline.forEach((t) => {
      const dateStr = t.date || "Date unspecified";
      const typeStr = t.type || "Event";
      const titleStr = t.title || "Medical Record";
      const descStr = t.description || "";

      renderKeyValue(`* ${dateStr} [${typeStr}]:`, `${titleStr} ${descStr ? `— ${descStr}` : ""}`);
    });
    currentY += 8;
  }

  // 7. Lab Investigations & Reports
  if (reports.length > 0) {
    renderSectionHeader("Digitized Medical Reports & Lab Files");
    reports.forEach((r) => {
      const title = r.title || r.fileName || "Uploaded Medical Document";
      const meta = `${r.type || "Report"} · ${r.date || "Recent"} · ${r.fileSize || ""}`;
      renderKeyValue(`* ${title}:`, `${meta} ${r.aiSummary ? `\nSummary: ${r.aiSummary}` : ""}`);
    });
    currentY += 8;
  }

  // 8. Emergency Contacts
  if (patient.emergencyContacts && patient.emergencyContacts.length > 0) {
    renderSectionHeader("Emergency Contacts");
    patient.emergencyContacts.forEach((c) => {
      renderKeyValue(`* ${c.name} (${c.relation}):`, c.phone);
    });
    currentY += 8;
  }

  // 9. Medical Disclaimer & Traceability
  ensureSpace(50);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
  currentY += 12;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  const disclaimer =
    "AI-Generated Medical Summary. This document consolidates digitized health records for organizational and reference purposes only and does not constitute a formal diagnosis or medical prescription. Always verify critical clinical information against original doctor records and consult a licensed physician.";
  const wrappedDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(wrappedDisclaimer, marginLeft, currentY);

  // POST-PROCESSING: Render Footer on all pages ("Page X of Y")
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, pageHeight - 35, pageWidth - marginRight, pageHeight - 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Health Passport AI · Confidential Patient Medical Record", marginLeft, pageHeight - 20);

    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginRight, pageHeight - 20, { align: "right" });
  }

  const safeFilename = (patient.name || "Patient").replace(/[^a-zA-Z0-9.-]/g, "-");
  doc.save(`${safeFilename}-Health-Summary.pdf`);
}
