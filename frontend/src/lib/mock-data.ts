import type {
  Appointment,
  HealthInsight,
  MedicalReport,
  Medication,
  PatientProfile,
  TimelineEvent,
  User,
} from "@/types";

export const mockUser: User = {
  id: "P-100824",
  name: "Aarav Sharma",
  email: "aarav.sharma@gmail.com",
  role: "patient",
};

export const mockPatient: PatientProfile = {
  id: "P-100824",
  name: "Aarav Sharma",
  email: "aarav.sharma@gmail.com",
  phone: "+91 98765 43210",
  bloodGroup: "B+",
  dob: "1994-03-12",
  height: "174 cm",
  weight: "72 kg",
  allergies: [
    {
      id: "a1",
      substance: "Penicillin",
      severity: "Severe",
      reaction: "Anaphylaxis risk — avoid all penicillin-class antibiotics",
    },
    {
      id: "a2",
      substance: "Peanuts",
      severity: "Moderate",
      reaction: "Hives, swelling of lips",
    },
    {
      id: "a3",
      substance: "Dust Mites",
      severity: "Mild",
      reaction: "Sneezing, nasal congestion",
    },
  ],
  chronicDiseases: ["Type 2 Diabetes", "Hypertension"],
  emergencyContacts: [
    { id: "e1", name: "Priya Sharma", relation: "Spouse", phone: "+91 98100 11223" },
    { id: "e2", name: "Ramesh Sharma", relation: "Father", phone: "+91 98990 55443" },
  ],
  medications: [
    {
      id: "m1",
      name: "Metformin 500mg",
      dosage: "500 mg",
      frequency: "Twice daily after meals",
      prescribedBy: "Dr. Neha Kapoor",
      startDate: "2026-01-10",
      active: true,
    },
    {
      id: "m2",
      name: "Amlodipine 5mg",
      dosage: "5 mg",
      frequency: "Once daily in the morning",
      prescribedBy: "Dr. Anil Mehta",
      startDate: "2025-11-02",
      active: true,
    },
    {
      id: "m3",
      name: "Vitamin D3 60K",
      dosage: "60,000 IU",
      frequency: "Once weekly",
      prescribedBy: "Dr. Neha Kapoor",
      startDate: "2026-02-01",
      active: false,
    },
  ],
  appointments: [
    {
      id: "ap1",
      doctor: "Dr. Neha Kapoor",
      specialty: "Endocrinologist",
      date: "2026-08-05",
      time: "10:30 AM",
      location: "Apollo Hospital, Delhi",
      status: "upcoming",
    },
    {
      id: "ap2",
      doctor: "Dr. Anil Mehta",
      specialty: "Cardiologist",
      date: "2026-08-18",
      time: "04:00 PM",
      location: "Max Healthcare, Delhi",
      status: "upcoming",
    },
    {
      id: "ap3",
      doctor: "Dr. S. Iyer",
      specialty: "General Physician",
      date: "2026-06-21",
      time: "11:00 AM",
      location: "Apollo Hospital, Delhi",
      status: "completed",
    },
  ],
  reports: [
    {
      id: "r1",
      title: "HbA1c Panel",
      type: "Lab Report",
      date: "2026-07-15",
      doctor: "Dr. Neha Kapoor",
      hospital: "Apollo Diagnostics",
      fileUrl: "#",
      fileSize: "412 KB",
      extracted:
        "HbA1c: 6.9% (Target < 7.0%)\nFasting Glucose: 128 mg/dL\nPost-prandial Glucose: 178 mg/dL\nLipid Profile: LDL 98, HDL 46, Triglycerides 142",
      aiSummary:
        "Glycemic control is adequate. HbA1c improved from 7.4% to 6.9% over last quarter. Lipid profile within acceptable range for diabetic patient. Continue current metformin dose.",
    },
    {
      id: "r2",
      title: "Cardiac Stress Test",
      type: "Imaging",
      date: "2026-06-02",
      doctor: "Dr. Anil Mehta",
      hospital: "Max Heart Institute",
      fileUrl: "#",
      fileSize: "2.1 MB",
      extracted:
        "Treadmill test: Completed 8 minutes, Bruce protocol. No significant ST changes. Target HR reached. Negative for inducible ischemia.",
      aiSummary:
        "Stress test negative for ischemia. Excellent exercise tolerance. No coronary intervention indicated. Continue lifestyle modifications and blood pressure monitoring.",
    },
    {
      id: "r3",
      title: "Annual Blood Work",
      type: "Lab Report",
      date: "2026-03-18",
      doctor: "Dr. S. Iyer",
      hospital: "Apollo Diagnostics",
      fileUrl: "#",
      fileSize: "680 KB",
      extracted:
        "Hemoglobin: 14.2 g/dL | WBC: 7200 /μL | Platelets: 2.6 L/μL | Creatinine: 0.9 mg/dL | eGFR: 98 mL/min/1.73m² | ALT: 32 U/L | Vitamin D: 19 ng/mL (deficient)",
      aiSummary:
        "Routine labs largely normal. Vitamin D deficiency detected (19 ng/mL) — vitamin D supplementation initiated. Renal and liver function normal. Repeat Vitamin D level in 3 months.",
    },
  ],
  healthScore: 82,
};

export const mockTimeline: TimelineEvent[] = [
  {
    id: "t1",
    date: "2026-07-15",
    type: "Lab Report",
    title: "HbA1c improved to 6.9%",
    description:
      "Quarterly HbA1c trending downward — glycemic control improving with Metformin.",
    severity: "success",
  },
  {
    id: "t2",
    date: "2026-06-02",
    type: "Diagnosis",
    title: "Negative cardiac stress test",
    description:
      "Treadmill test showed no inducible ischemia. Cardiac risk assessed as low.",
    severity: "success",
  },
  {
    id: "t3",
    date: "2026-03-18",
    type: "Lab Report",
    title: "Vitamin D deficiency",
    description:
      "Levels at 19 ng/mL. Supplementation with Vitamin D3 60K IU started.",
    severity: "warning",
  },
  {
    id: "t4",
    date: "2025-11-02",
    type: "Diagnosis",
    title: "Stage 1 Hypertension",
    description:
      "Sustained BP readings of 138/88. Amlodipine 5mg initiated. Home BP monitoring advised.",
    severity: "warning",
  },
  {
    id: "t5",
    date: "2025-01-14",
    type: "Diagnosis",
    title: "Type 2 Diabetes diagnosed",
    description:
      "Fasting glucose 168 mg/dL, HbA1c 7.8%. Metformin 500mg started with diet plan.",
    severity: "danger",
  },
  {
    id: "t6",
    date: "2024-08-05",
    type: "Surgery",
    title: "Laparoscopic appendectomy",
    description:
      "Emergency removal of appendix. Uneventful recovery. No complications.",
    severity: "info",
  },
  {
    id: "t7",
    date: "2024-01-20",
    type: "Vaccination",
    title: "Influenza vaccine administered",
    description: "Seasonal flu shot received. No adverse reaction reported.",
    severity: "success",
  },
  {
    id: "t8",
    date: "2023-05-12",
    type: "Vaccination",
    title: "COVID-19 booster (4th dose)",
    description: "mRNA booster received. Mild soreness at injection site only.",
    severity: "success",
  },
];

export const mockInsights: HealthInsight[] = [
  {
    id: "i1",
    icon: "trending",
    title: "Glycemic control improving",
    detail: "HbA1c down 0.9% in 6 months. Keep current Metformin regimen and dietary discipline.",
    tone: "positive",
  },
  {
    id: "i2",
    icon: "heart",
    title: "Cardiac risk is low",
    detail: "Recent stress test was negative. Continue 30 min of daily walking to maintain BP in range.",
    tone: "positive",
  },
  {
    id: "i3",
    icon: "sun",
    title: "Vitamin D needs follow-up",
    detail: "Supplementing 60K IU weekly. Re-test levels in 3 months to confirm normalization.",
    tone: "warning",
  },
  {
    id: "i4",
    icon: "alert",
    title: "Penicillin allergy flagged",
    detail: "Allergy severity is high. Ensure alternate antibiotic classes are selected in any new prescription.",
    tone: "action",
  },
];

export const mockDoctors = [
  { id: "d1", name: "Dr. Neha Kapoor", specialty: "Endocrinologist", hospital: "Apollo Hospital", patients: 1284, rating: 4.9 },
  { id: "d2", name: "Dr. Anil Mehta", specialty: "Cardiologist", hospital: "Max Healthcare", patients: 967, rating: 4.8 },
  { id: "d3", name: "Dr. S. Iyer", specialty: "General Physician", hospital: "Apollo Hospital", patients: 2103, rating: 4.7 },
];

export const mockAuditLogs = [
  { id: "al1", user: "Aarav Sharma", action: "Accessed health passport", ip: "103.44.12.87", time: "2026-07-31 09:14:22", level: "info" },
  { id: "al2", user: "Dr. Neha Kapoor", action: "Viewed patient record P-100824", ip: "115.98.3.21", time: "2026-07-31 08:52:05", level: "info" },
  { id: "al3", user: "Emergency Access", action: "Read-only QR scan — P-100824", ip: "49.36.120.4", time: "2026-07-30 22:41:11", level: "warning" },
  { id: "al4", user: "system", action: "Gemini AI summary regenerated", ip: "backend", time: "2026-07-30 21:10:44", level: "info" },
  { id: "al5", user: "unknown", action: "Failed login attempt (3x)", ip: "182.71.55.90", time: "2026-07-30 20:33:19", level: "danger" },
];

export const mockHospitals = [
  { id: "h1", name: "Apollo Hospital", city: "New Delhi", beds: 820, doctors: 640, verified: true },
  { id: "h2", name: "Max Healthcare", city: "New Delhi", beds: 540, doctors: 420, verified: true },
  { id: "h3", name: "AIIMS", city: "New Delhi", beds: 2000, doctors: 1400, verified: true },
  { id: "h4", name: "Fortis Memorial", city: "Gurugram", beds: 480, doctors: 310, verified: false },
];
