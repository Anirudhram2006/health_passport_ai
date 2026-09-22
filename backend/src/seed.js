const mongoose = require("mongoose");
const User = require("./models/User");
const Patient = require("./models/Patient");
const Hospital = require("./models/Hospital");
const Appointment = require("./models/Appointment");
const MedicalReport = require("./models/MedicalReport");
const AuditLog = require("./models/AuditLog");

async function seedData() {
  try {
    const adminExists = await User.findOne({ email: "admin@healthpassport.ai" });
    if (adminExists) {
      console.log("[seed] Demo data already seeded. Skipping.");
      return;
    }

    console.log("[seed] Seeding database with initial real entities...");

    // 1. Create Users
    const adminUser = await User.create({
      name: "System Administrator",
      email: "admin@healthpassport.ai",
      password: "adminpassword123",
      role: "admin",
      verified: true,
      status: "active",
    });

    const docNeha = await User.create({
      name: "Dr. Neha Kapoor",
      email: "dr.neha@apollo.in",
      password: "doctorpassword123",
      role: "doctor",
      verified: true,
      status: "active",
      phone: "+91 98111 22334",
    });

    const docAnil = await User.create({
      name: "Dr. Anil Mehta",
      email: "dr.anil@max.in",
      password: "doctorpassword123",
      role: "doctor",
      verified: true,
      status: "active",
      phone: "+91 98222 33445",
    });

    const docSunita = await User.create({
      name: "Dr. Sunita Rao",
      email: "dr.sunita@fortis.in",
      password: "doctorpassword123",
      role: "doctor",
      verified: false, // Pending verification for admin approval queue
      status: "active",
      phone: "+91 98333 44556",
    });

    const patientAaravUser = await User.create({
      name: "Aarav Sharma",
      email: "aarav.sharma@gmail.com",
      password: "patientpassword123",
      role: "patient",
      verified: true,
      status: "active",
      phone: "+91 98765 43210",
    });

    const patientPriyaUser = await User.create({
      name: "Priya Nair",
      email: "priya.nair@gmail.com",
      password: "patientpassword123",
      role: "patient",
      verified: true,
      status: "active",
      phone: "+91 98980 11223",
    });

    const patientRahulUser = await User.create({
      name: "Rahul Verma",
      email: "rahul.verma@gmail.com",
      password: "patientpassword123",
      role: "patient",
      verified: true,
      status: "active",
      phone: "+91 97110 55667",
    });

    // 2. Create Patients Profiles
    const patientAarav = await Patient.create({
      userId: patientAaravUser._id,
      passportId: "P-100824",
      bloodGroup: "B+",
      dob: new Date("1994-03-12"),
      height: "174 cm",
      weight: "72 kg",
      allergies: [
        { substance: "Penicillin", severity: "Severe", reaction: "Anaphylaxis risk — avoid beta-lactam antibiotics" },
        { substance: "Peanuts", severity: "Moderate", reaction: "Hives, swelling of lips" },
      ],
      chronicDiseases: ["Type 2 Diabetes", "Stage 1 Hypertension"],
      emergencyContacts: [
        { name: "Priya Sharma", relation: "Spouse", phone: "+91 98100 11223" },
        { name: "Ramesh Sharma", relation: "Father", phone: "+91 98990 55443" },
      ],
      medications: [
        { name: "Metformin 500mg", dosage: "500 mg", frequency: "Twice daily after meals", prescribedBy: "Dr. Neha Kapoor", startDate: new Date("2026-01-10"), active: true },
        { name: "Amlodipine 5mg", dosage: "5 mg", frequency: "Once daily in the morning", prescribedBy: "Dr. Anil Mehta", startDate: new Date("2025-11-02"), active: true },
      ],
      healthScore: 82,
    });

    const patientPriya = await Patient.create({
      userId: patientPriyaUser._id,
      passportId: "P-204918",
      bloodGroup: "O+",
      dob: new Date("1996-07-22"),
      height: "162 cm",
      weight: "58 kg",
      allergies: [
        { substance: "Sulfa Drugs", severity: "Severe", reaction: "Severe skin rash" },
      ],
      chronicDiseases: ["Asthma"],
      emergencyContacts: [
        { name: "Suresh Nair", relation: "Brother", phone: "+91 98100 99887" },
      ],
      medications: [
        { name: "Salbutamol Inhaler", dosage: "100 mcg", frequency: "As needed for acute wheezing", prescribedBy: "Dr. Neha Kapoor", startDate: new Date("2025-05-14"), active: true },
      ],
      healthScore: 90,
    });

    const patientRahul = await Patient.create({
      userId: patientRahulUser._id,
      passportId: "P-309182",
      bloodGroup: "A+",
      dob: new Date("1989-11-05"),
      height: "180 cm",
      weight: "81 kg",
      allergies: [
        { substance: "Latex", severity: "Mild", reaction: "Contact dermatitis" },
      ],
      chronicDiseases: ["Hypercholesterolemia"],
      emergencyContacts: [
        { name: "Anjali Verma", relation: "Spouse", phone: "+91 98777 66554" },
      ],
      medications: [
        { name: "Atorvastatin 10mg", dosage: "10 mg", frequency: "Once daily at bedtime", prescribedBy: "Dr. Anil Mehta", startDate: new Date("2026-02-01"), active: true },
      ],
      healthScore: 76,
    });

    // 3. Create Hospitals
    await Hospital.create([
      { name: "Apollo Hospital", city: "New Delhi", address: "Sarita Vihar, Mathura Road", beds: 820, doctors: 640, verified: true, license: "MCI-HOSP-0192" },
      { name: "Max Healthcare", city: "New Delhi", address: "Saket Institutional Area", beds: 540, doctors: 420, verified: true, license: "MCI-HOSP-0481" },
      { name: "AIIMS", city: "New Delhi", address: "Ansari Nagar", beds: 2000, doctors: 1400, verified: true, license: "GOV-AIIMS-001" },
      { name: "Fortis Memorial", city: "Gurugram", address: "Sector 44", beds: 480, doctors: 310, verified: false, license: "MCI-HOSP-0822" },
    ]);

    // 4. Create Appointments
    await Appointment.create([
      {
        patientId: patientAarav._id,
        doctorId: docNeha._id,
        doctor: "Dr. Neha Kapoor",
        specialty: "Endocrinologist",
        date: new Date("2026-08-05T10:30:00.000Z"),
        time: "10:30 AM",
        location: "Apollo Hospital, Delhi",
        status: "upcoming",
        notes: "Quarterly diabetes evaluation & HbA1c review",
      },
      {
        patientId: patientPriya._id,
        doctorId: docNeha._id,
        doctor: "Dr. Neha Kapoor",
        specialty: "Endocrinologist",
        date: new Date("2026-08-05T11:15:00.000Z"),
        time: "11:15 AM",
        location: "Apollo Hospital, Delhi",
        status: "upcoming",
        notes: "Thyroid function assessment",
      },
      {
        patientId: patientRahul._id,
        doctorId: docAnil._id,
        doctor: "Dr. Anil Mehta",
        specialty: "Cardiologist",
        date: new Date("2026-08-06T14:00:00.000Z"),
        time: "02:00 PM",
        location: "Max Healthcare, Delhi",
        status: "upcoming",
        notes: "Lipid profile follow-up & ECG",
      },
    ]);

    // 5. Create Medical Reports
    await MedicalReport.create([
      {
        patientId: patientAarav._id,
        title: "HbA1c Panel",
        type: "Lab Report",
        doctor: "Dr. Neha Kapoor",
        hospital: "Apollo Diagnostics",
        fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
        reportUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
        fileSize: "412 KB",
        extracted: "HbA1c: 6.9% | Fasting Glucose: 128 mg/dL | Post-prandial: 178 mg/dL",
        aiSummary: "Glycemic control is adequate. HbA1c improved from 7.4% to 6.9% over last quarter. Continue Metformin regimen.",
      },
      {
        patientId: patientAarav._id,
        title: "Cardiac Stress Test",
        type: "Imaging",
        doctor: "Dr. Anil Mehta",
        hospital: "Max Heart Institute",
        fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
        reportUrl: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
        fileSize: "2.1 MB",
        extracted: "Treadmill test completed 8 mins. No significant ST changes. Negative for inducible ischemia.",
        aiSummary: "Stress test negative for ischemia. Excellent exercise tolerance. Cardiac risk assessed as low.",
      },
    ]);

    // 6. Create Audit Logs
    await AuditLog.create([
      { user: "admin@healthpassport.ai", action: "System initialized & seeded", ip: "127.0.0.1", level: "info" },
      { user: "dr.neha@apollo.in", action: "Accessed patient record P-100824", ip: "115.98.3.21", level: "info" },
      { user: "system", action: "Gemini AI medical summary index refreshed", ip: "backend", level: "info" },
    ]);

    console.log("[seed] Seeding completed successfully!");
  } catch (err) {
    console.error("[seed] Error seeding database:", err.message);
  }
}

module.exports = { seedData };
