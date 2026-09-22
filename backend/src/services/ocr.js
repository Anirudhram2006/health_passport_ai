const fs = require("fs");
const path = require("path");
const os = require("os");
const Tesseract = require("tesseract.js");
const { PDFParse } = require("pdf-parse");
const { preprocessImage } = require("./imagePreprocessor");

async function fetchBuffer(filePathOrUrl) {
  if (typeof filePathOrUrl === "string" && /^https?:\/\//i.test(filePathOrUrl)) {
    const res = await fetch(filePathOrUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching file from ${filePathOrUrl}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else if (Buffer.isBuffer(filePathOrUrl)) {
    return filePathOrUrl;
  } else {
    return fs.readFileSync(filePathOrUrl);
  }
}

async function extractText(filePathOrUrl, mimeType = "", originalName = "") {
  try {
    let buffer = await fetchBuffer(filePathOrUrl);

    const isPdf =
      (mimeType && mimeType.includes("pdf")) ||
      (originalName && originalName.toLowerCase().endsWith(".pdf")) ||
      (typeof filePathOrUrl === "string" && /\.pdf$/i.test(filePathOrUrl.split("?")[0])) ||
      buffer.slice(0, 4).toString() === "%PDF-";

    if (isPdf) {
      try {
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const parsed = await parser.getText();
        if (typeof parser.destroy === "function") await parser.destroy();
        const extractedText = (typeof parsed === "string" ? parsed : parsed?.text || "")
          .replace(/-- \d+ of \d+ --/g, "")
          .trim();

        if (extractedText && extractedText.length > 10) {
          console.log("[ocr] PDF text extracted via pdf-parse successfully");
          return extractedText;
        }
      } catch (pdfErr) {
        console.warn("[ocr] pdf-parse direct extraction warning:", pdfErr.message);
      }

      // If PDF text extraction returned empty/scanned PDF, try converting Cloudinary PDF to PNG page 1
      if (typeof filePathOrUrl === "string" && filePathOrUrl.includes("cloudinary.com")) {
        const pngUrl = filePathOrUrl
          .replace(/\/upload\/(v\d+\/)?/, "/upload/f_png,pg_1/")
          .replace(/\.pdf$/i, ".png");
        try {
          const res = await fetch(pngUrl);
          if (res.ok) {
            buffer = Buffer.from(await res.arrayBuffer());
          }
        } catch (e) {
          console.warn("[ocr] Cloudinary PDF page 1 fetch failed:", e.message);
        }
      }
    }

    // Image Preprocessing before Tesseract
    const processedBuffer = await preprocessImage(buffer);

    // Image OCR with Tesseract
    const backendDir = path.resolve(__dirname, "..");
    const tempFile = path.join(
      os.tmpdir(),
      `ocr_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
    );
    fs.writeFileSync(tempFile, processedBuffer);

    try {
      const { data } = await Tesseract.recognize(tempFile, "eng", {
        langPath: backendDir,
        logger: () => {},
      });
      return (data.text || "").trim();
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
    }
  } catch (err) {
    console.error("[ocr] extraction error:", err.message);
    throw new Error(`OCR extraction failed: ${err.message}`);
  }
}

module.exports = { extractText, fetchBuffer };
