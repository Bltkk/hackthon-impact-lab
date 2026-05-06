const express = require("express");
const router = express.Router();
const { analyzePhishing } = require("../services/claude");
const { checkDomain } = require("../services/domainCheck");
const { checkSafeBrowsing } = require("../services/safeBrowsing");
const { checkVirusTotal } = require("../services/virusTotal");
const { checkPhishTank } = require("../services/phishTank");
const { extractTextFromImage } = require("../services/ocr");
const { extractUrl } = require("../services/urlExtractor");

/**
 * POST /api/analyze
 * Body: { text?: string, url?: string, imageBase64?: string }
 */
router.post("/", async (req, res) => {
  try {
    const { text, url: rawUrl, imageBase64 } = req.body;

    let originalText = text ?? "";
    let targetUrl = rawUrl ?? null;

    // If image provided, run OCR first
    if (imageBase64) {
      originalText = await extractTextFromImage(imageBase64);
    }

    // Extract URL from text if not provided directly
    if (!targetUrl && originalText) {
      targetUrl = extractUrl(originalText);
    }

    if (!originalText && !targetUrl) {
      return res.status(400).json({ error: "Debes enviar texto, URL o imagen" });
    }

    // Run all signal checks in parallel
    const [domainResult, safeBrowsingResult, virusTotalResult, phishTankResult] = await Promise.allSettled([
      targetUrl ? checkDomain(targetUrl) : Promise.resolve(null),
      targetUrl ? checkSafeBrowsing(targetUrl) : Promise.resolve(null),
      targetUrl ? checkVirusTotal(targetUrl) : Promise.resolve(null),
      targetUrl ? checkPhishTank(targetUrl) : Promise.resolve(null),
    ]);

    const analysis = await analyzePhishing({
      originalText,
      url: targetUrl,
      domainResult: domainResult.value,
      safeBrowsingResult: safeBrowsingResult.value,
      virusTotalResult: virusTotalResult.value,
      phishTankResult: phishTankResult.value,
    });

    res.json({
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      explanation: analysis.explanation,
      redFlags: analysis.redFlags,
      recommendation: analysis.recommendation,
      url: targetUrl,
      signals: {
        domain: domainResult.value,
        safeBrowsing: safeBrowsingResult.value,
        virusTotal: virusTotalResult.value,
        phishTank: phishTankResult.value,
      },
    });
  } catch (err) {
    console.error("analyze error:", err);
    res.status(500).json({ error: "Error interno al analizar el mensaje", _debug: err.message });
  }
});

module.exports = router;
