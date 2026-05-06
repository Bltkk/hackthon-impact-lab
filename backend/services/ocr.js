const fetch = require("node-fetch");

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * Runs OCR on a base64-encoded image using Google Cloud Vision API.
 * Returns the extracted plain text.
 */
async function extractTextFromImage(base64Image) {
  const apiKey = process.env.GOOGLE_VISION_KEY;
  if (!apiKey) {
    console.error("[ocr] GOOGLE_VISION_KEY not set");
    throw new Error("OCR_KEY_MISSING");
  }

  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
      },
    ],
  };

  const res = await fetch(`${VISION_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`[ocr] Vision API ${res.status}:`, JSON.stringify(data));
    throw new Error(`OCR_API_ERROR_${res.status}`);
  }

  if (data.responses?.[0]?.error) {
    console.error("[ocr] Vision response error:", data.responses[0].error);
    throw new Error("OCR_RESPONSE_ERROR");
  }

  const text = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  console.log(`[ocr] extracted ${text.length} chars`);
  return text;
}

module.exports = { extractTextFromImage };
