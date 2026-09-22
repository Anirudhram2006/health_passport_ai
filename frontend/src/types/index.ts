export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface MedicineCandidate {
  name: string;
  brandName?: string;
  genericName?: string;
  activeIngredients?: string[];
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  rxNormCui?: string;
  source?: string;
  confidence: number;
  matchType?: string;
}

export interface MedicationItem {
  rawText?: string;
  brandName?: string | null;
  genericName?: string | null;
  medicineName?: string | null;
  activeIngredients?: string[];
  strength?: string | null;
  dosageForm?: string | null;
  dose?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  frequencyInterpreted?: string | null;
  route?: string | null;
  duration?: string | null;
  quantity?: string | null;
  timing?: string | null;
  instructions?: string | null;
  rxNormCui?: string | null;
  confidence?: number;
  needsReview?: boolean;
  status?: "verified" | "needs_review" | "unresolved" | "verified_by_user";
  candidates?: MedicineCandidate[];
}

export interface PrescriptionExtraction {
  title?: string;
  type?: string;
  patient?: {
    name?: string | null;
    age?: string | null;
    gender?: string | null;
    date?: string | null;
    patientId?: string | null;
  };
  doctor?: {
    name?: string | null;
    licenseNumber?: string | null;
    hospital?: string | null;
    contact?: string | null;
  };
  medications?: MedicationItem[];
  diagnoses?: string[];
  allergies?: string[];
  labValues?: Array<{
    testName: string;
    result: string;
    unit?: string | null;
    referenceRange?: string | null;
    isAbnormal?: boolean;
  }>;
  generalInstructions?: string[];
  summary?: string;
  overallConfidence?: number;
  needsReview?: boolean;
  rawOcrText?: string;
}

export interface MedicalReport {
  id?: string;
  _id?: string;
  title: string;
  type: "Lab Report" | "Prescription" | "Imaging" | "Discharge Summary" | "Vaccination";
  date?: string;
  doctor?: string;
  hospital?: string;
  fileUrl: string;
  reportUrl?: string;
  publicId?: string;
  fileName?: string;
  fileSize?: string;
  rawText?: string;
  extracted?: string;
  aiSummary?: string;
  extractionStatus?: "pending_review" | "reviewed" | "failed";
  overallConfidence?: number;
  needsReview?: boolean;
  extractedData?: PrescriptionExtraction;
  reviewedData?: PrescriptionExtraction;
  reviewedAt?: string;
}

export interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  brandName?: string;
  genericName?: string;
  activeIngredients?: string[];
  strength?: string;
  duration?: string;
}

export interface PatientProfile {
  id: string;
  passportId?: string;
  name: string;

  email: string;
  phone: string;
  bloodGroup: string;
  dob: string;
  height: string;
  weight: string;
  allergies: { id: string; substance: string; severity: "Mild" | "Moderate" | "Severe"; reaction: string }[];
  chronicDiseases: string[];
  emergencyContacts: { id: string; name: string; relation: string; phone: string }[];
  medications: Medication[];
  appointments: Appointment[];
  reports: MedicalReport[];
  healthScore: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: "Diagnosis" | "Surgery" | "Vaccination" | "Medication" | "Lab Report";
  title: string;
  description: string;
  severity?: "info" | "success" | "warning" | "danger";
}

export interface HealthInsight {
  id: string;
  icon: string;
  title: string;
  detail: string;
  tone: "positive" | "warning" | "action";
}
