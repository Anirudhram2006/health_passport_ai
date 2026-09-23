const router = require("express").Router();
const DoctorRegistry = require("../models/DoctorRegistry");
const { verifyAndFetchDoctor } = require("../services/doctorScraper");

// POST /api/doctors/verify — Scrape & Verify Doctor by NMC / TNMC Registration Number
router.post("/verify", async (req, res, next) => {
  try {
    const { registrationNumber } = req.body;
    if (!registrationNumber) {
      return res.status(400).json({ status: "ERROR", message: "Registration number is required" });
    }

    const verificationResult = await verifyAndFetchDoctor(registrationNumber);
    if (!verificationResult.verified) {
      return res.status(404).json({ status: "NOT_FOUND", ...verificationResult });
    }

    res.json({
      status: "SUCCESS",
      doctor: verificationResult,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/registry — List all verified doctors in registry
router.get("/registry", async (req, res, next) => {
  try {
    const doctors = await DoctorRegistry.find().sort({ createdAt: -1 });
    res.json({ status: "SUCCESS", count: doctors.length, doctors });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/registry/:regNo — Lookup doctor by registration number
router.get("/registry/:regNo", async (req, res, next) => {
  try {
    const doctor = await verifyAndFetchDoctor(req.params.regNo);
    if (!doctor.verified) {
      return res.status(404).json({ status: "NOT_FOUND", message: doctor.message });
    }
    res.json({ status: "SUCCESS", doctor });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
