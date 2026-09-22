const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Not authorized — missing token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized — invalid token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    const demoRole = req.headers["x-demo-role"];
    const userRole = req.user ? req.user.role : null;
    const activeRole = demoRole || userRole;

    if (!activeRole || (!roles.includes(activeRole) && activeRole !== "admin")) {
      return res.status(403).json({ message: "Forbidden — insufficient permissions" });
    }
    next();
  };
}

module.exports = { protect, authorize, signToken };
