function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  console.error("[error]", err);
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation failed", details: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate entry", details: err.message });
  }
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
}

module.exports = { notFound, errorHandler };
