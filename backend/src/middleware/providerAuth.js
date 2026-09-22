/**
 * Provider Access Control Middleware (Module 12)
 * Ensures user is authenticated and has verified doctor or hospital role.
 */

const User = require("../models/User");

async function requireVerifiedProvider(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Role check: doctor, hospital, or admin
    const allowedRoles = ["doctor", "hospital", "admin"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access restricted to verified medical providers" });
    }

    // Admin passes directly
    if (req.user.role === "admin") return next();

    // Check verification status
    const userDoc = await User.findById(req.user._id);
    if (!userDoc || !userDoc.verified) {
      return res.status(403).json({
        message: "Provider account verification pending. Medical credentials must be verified.",
        verified: false,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireVerifiedProvider };
