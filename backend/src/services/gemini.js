const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function client() {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
}

// Common prescription abbreviation dictionary for post-processing
const ABBREVIATION_MAP = {
  OD: "once daily",
  BD: "twice daily",
  BID: "twice daily",
  TDS: "three times daily",
  TID: "three times daily",
  QID: "four times daily",
  HS: "at bedtime / night",
  SOS: "as needed (when required)",
  AC: "before meals",
  PC: "after meals",
  STAT: "immediately",
  IV: "intravenous",
  IM: "intramuscular",
  SC: "subcutaneous",
  PO: "by mouth",
  PRN: "as needed",
};

// Common medication reference dictionary for candidate suggestions
const COMMON_MEDICATIONS = [
  "Amoxicillin", "Ampicillin", "Augmentin", "Azithromycin", "Amlodipine", "Atorvastatin",
  "Alprazolam", "Aceclofenac", "Aciloc", "Allegra",
  "Bisoprolol", "Budesonide", "Baclofen",
  "Cetirizine", "Ciprofloxacin", "Clarithromycin", "Cefixime", "Cefuroxime", "Clopidogrel", "Chlorthalidone",
  "Dolo 650", "Doxycycline", "Diltiazem", "Duloxetine", "Deflazacort", "Deriphyllin",
  "Erythromycin", "Enalapril", "Esomeprazole", "Empagliflozin",
  "Furosemide", "Fluconazole", "Ferrous Sulfate", "Folic Acid",
  "Gabapentin", "Glimepiride", "Gliclazide",
  "Hydrochlorothiazide", "Hydralazine", "Human Insulin",
  "Ibuprofen", "Ivermectin", "Itraconazole", "Isosorbide Mononitrate",
  "Levothyroxine", "Losartan", "Lisinopril", "Levofloxacin", "Loperamide", "Linezolid", "Limcee",
  "Metformin", "Metoprolol", "Montelukast", "Multivitamin", "Methylprednisolone", "Meftal-Spas",
  "Naproxen", "Nifedipine", "Norfloxacin", "Nitrofurantoin",
  "Omeprazole", "Ofloxacin", "Ondansetron", "Ozempic", "Ornidazole",
  "Paracetamol", "Pantoprazole", "Prednisolone", "Pioglitazone", "Pan 40",
  "Rosuvastatin", "Ranitidine", "Rifaximin",
  "Salbutamol", "Sertraline", "Spironolactone", "Sitagliptin", "Shelcal",
  "Telmisartan", "Tramadol", "Torsemide", "Thyronorm",
  "Ursodeoxycholic Acid", "Unienzyme",
  "Valsartan", "Vildagliptin", "Vitamin D3", "Vitamin C", "Volini",
  "Warfarin", "Zolpidem", "Zifi 200"
];

function findMedicineCandidates(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") return [];
  const clean = rawQuery.trim().toLowerCase();
  if (clean.length < 2) return [];

  const matches = COMMON_MEDICATIONS.filter((med) => {
    const m = med.toLowerCase();
    return m.startsWith(clean) || m.includes(clean) || clean.startsWith(m.slice(0, 3));
  });

  return matches.slice(0, 5);
}

function resolveAbbreviations(instructionStr) {
  if (!instructionStr) return { rawInstruction: "", interpretedInstruction: "" };
  const upper = instructionStr.trim().toUpperCase();
  const interpreted = ABBREVIATION_MAP[upper] || instructionStr;
  return {
    rawInstruction: instructionStr,
    interpretedInstruction: interpreted,
  };
}

/**
 * Strict Document & Vision understanding for Prescriptions & Lab Reports
 */
async function analyzePrescriptionDocument(buffer, mimeType, rawOcrText = "") {
  const prompt = `
You are a expert medical documentation assistant specializing in handwritten and printed prescription analysis.
Analyze this prescription image/document directly, along with optional raw OCR text: "${rawOcrText.slice(0, 2000)}".

CRITICAL ACCURACY & NO-HALLUCINATION RULES:
1. ONLY extract information that is explicitly visible in the document.
2. If any field or medication name is illegible, incomplete, or ambiguous (e.g. "Metf... 500" or scribble), DO NOT guess or invent the full medicine name or dosage.
   - Set "medicineName" to null or the exact legible prefix.
   - Set "rawText" to the exact string seen.
   - Set "confidence" to a low float value (between 0.10 and 0.50).
   - Set "needsReview" to true.
3. For clear, legible fields, set "confidence" between 0.85 and 0.99, and "needsReview" to false.
4. Extract prescription details:
   - Patient Info: name, age, gender, date, patientId
   - Doctor Info: name, licenseNumber, hospital, contact
   - Medications list: rawText, medicineName, strength, dosage, frequency, route, duration, quantity, timing, instructions, confidence (0.0 to 1.0), needsReview (boolean)
   - Clinical Info: diagnoses, symptoms, allergies, tests, followUpDate, generalInstructions
5. For frequency/timing (e.g. "OD", "BD", "TDS", "QID", "HS", "SOS", "AC", "PC"), provide both the raw code and plain English meaning.

Return STRICT JSON format adhering to this structure:

{
  "title": "Prescription - [Doctor or Patient Name or Date]",
  "type": "Prescription",
  "patient": {
    "name": string | null,
    "age": string | null,
    "gender": string | null,
    "date": string | null,
    "patientId": string | null
  },
  "doctor": {
    "name": string | null,
    "licenseNumber": string | null,
    "hospital": string | null,
    "contact": string | null
  },
  "medications": [
    {
      "rawText": string,
      "medicineName": string | null,
      "strength": string | null,
      "dosage": string | null,
      "frequency": string | null,
      "route": string | null,
      "duration": string | null,
      "quantity": string | null,
      "timing": string | null,
      "instructions": string | null,
      "confidence": number,
      "needsReview": boolean
    }
  ],
  "diagnoses": [string],
  "allergies": [string],
  "labValues": [
    {
      "testName": string,
      "result": string,
      "unit": string | null,
      "referenceRange": string | null,
      "isAbnormal": boolean
    }
  ],
  "generalInstructions": [string],
  "summary": "2-3 sentence clinical summary of the prescription",
  "overallConfidence": number,
  "needsReview": boolean
}`;

  try {
    const isPdf = mimeType.includes("pdf");
    const finalMime = isPdf ? "application/pdf" : mimeType || "image/png";

    const part = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: finalMime,
      },
    };

    const result = await client().generateContent([prompt, part]);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Post-process medications to add candidate suggestions & abbreviation resolution
    if (Array.isArray(parsed.medications)) {
      parsed.medications = parsed.medications.map((med) => {
        const confidence = typeof med.confidence === "number" ? med.confidence : 0.8;
        const needsReview = Boolean(med.needsReview || confidence < 0.70 || !med.medicineName);
        
        // Find suggested medicine matches if name is partial or needs review
        const candidates = needsReview || !med.medicineName
          ? findMedicineCandidates(med.medicineName || med.rawText)
          : [];

        // Resolve frequency abbreviations
        const abbr = resolveAbbreviations(med.frequency || "");

        return {
          ...med,
          confidence,
          needsReview,
          candidates,
          frequencyInterpreted: abbr.interpretedInstruction,
        };
      });
    }

    // Determine overall review flag
    const hasUncertainMed = parsed.medications?.some((m) => m.needsReview);
    parsed.needsReview = Boolean(parsed.needsReview || hasUncertainMed || (parsed.overallConfidence && parsed.overallConfidence < 0.70));
    parsed.overallConfidence = parsed.overallConfidence || (parsed.needsReview ? 0.65 : 0.92);

    return parsed;
  } catch (err) {
    console.error("[gemini] analyzePrescriptionDocument failed:", err.message);
    throw new Error(`Vision analysis failed: ${err.message}`);
  }
}

async function summarizeReport(reportText) {
  const prompt = `
You are a medical documentation assistant. Structure the following extracted OCR text from a medical report into strict JSON:

{
  "title": "short title",
  "type": "Lab Report | Prescription | Imaging | Discharge Summary | Vaccination",
  "diagnoses": [],
  "medications": [],
  "allergies": [],
  "labValues": [],
  "summary": "2-3 sentence plain-language summary",
  "recommendations": []
}

Report text:
${reportText.slice(0, 6000)}`;

  try {
    const result = await client().generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[gemini] summarizeReport failed:", err.message);
    throw new Error("Gemini analysis failed");
  }
}

async function generateInsights(timeline) {
  const prompt = `
Based on this patient medical timeline, return JSON { "insights": [ { "title", "detail", "tone": "positive|warning|action" } ] }.
Provide up to 4 concise, clinically useful insights.

Timeline: ${JSON.stringify(timeline).slice(0, 6000)}`;

  try {
    const result = await client().generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned).insights;
  } catch (err) {
    console.error("[gemini] generateInsights failed:", err.message);
    throw new Error("Gemini insight generation failed");
  }
}

async function summarizeReportFromUrl(fileUrl, mimeType = "image/png") {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching file from ${fileUrl}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await analyzePrescriptionDocument(buffer, mimeType, "");
  } catch (err) {
    console.error("[gemini] summarizeReportFromUrl failed:", err.message);
    throw new Error("Gemini document vision analysis failed");
  }
}

module.exports = {
  analyzePrescriptionDocument,
  summarizeReport,
  summarizeReportFromUrl,
  generateInsights,
  findMedicineCandidates,
  resolveAbbreviations,
};
