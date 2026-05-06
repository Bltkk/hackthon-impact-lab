const fetch = require("node-fetch");

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * Runs OCR on a base64-encoded image using Google Cloud Vision API.
 * Returns the extracted plain text.
 */
async function extractTextFromImage(base64Image) {
  const apiKey = process.env.GOOGLE_VISION_KEY;
  if (!apiKey) {
    throw new Error("El análisis de imágenes no está disponible en este momento");
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

  if (!res.ok) {
    console.error(`Vision API error: ${res.status}`);
    throw new Error("Error al procesar la imagen. Intenta pegar el texto directamente.");
  }

  const data = await res.json();
  return data.responses?.[0]?.fullTextAnnotation?.text ?? "";
}

module.exports = { extractTextFromImage };
