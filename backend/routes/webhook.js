const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { analyzePhishing } = require("../services/claude");
const { checkDomain } = require("../services/domainCheck");
const { checkSafeBrowsing } = require("../services/safeBrowsing");
const { extractTextFromImage } = require("../services/ocr");
const { extractUrl } = require("../services/urlExtractor");
const { getHistory, pushHistory } = require("../services/conversation");

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// WhatsApp webhook verification (GET)
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming message handler (POST)
router.post("/", async (req, res) => {
  // Acknowledge immediately — WhatsApp requires fast 200 response
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return;

    const from = message.from;
    let originalText = "";
    let targetUrl = null;

    if (message.type === "text") {
      originalText = message.text.body;
      targetUrl = extractUrl(originalText);
    } else if (message.type === "image") {
      try {
        const mediaId = message.image.id;
        const mediaUrl = await getMediaUrl(mediaId);
        const base64 = await downloadMediaAsBase64(mediaUrl);
        originalText = await extractTextFromImage(base64);
        targetUrl = extractUrl(originalText);
        if (!originalText) {
          await sendWhatsAppMessage(from, "No pude leer texto en la imagen 🔍\n\nCopia y pega el mensaje sospechoso como texto y lo analizo al tiro.");
          return;
        }
      } catch (ocrErr) {
        console.error("OCR error:", ocrErr.message);
        await sendWhatsAppMessage(from, "No pude procesar la imagen en este momento 😕\n\nCopia y pega el texto del mensaje sospechoso y lo reviso igual de bien.");
        return;
      }
    } else {
      await sendWhatsAppMessage(from, "Envíame el mensaje sospechoso como texto o pantallazo para analizarlo 🔍");
      return;
    }

    if (!originalText && !targetUrl) {
      await sendWhatsAppMessage(from, "No encontré texto ni enlace en tu mensaje. Intenta reenviar el SMS completo.");
      return;
    }

    const history = getHistory(from);

    const [domainResult, safeBrowsingResult] = await Promise.allSettled([
      targetUrl ? checkDomain(targetUrl) : Promise.resolve(null),
      targetUrl ? checkSafeBrowsing(targetUrl) : Promise.resolve(null),
    ]);

    const analysis = await analyzePhishing({
      originalText,
      url: targetUrl,
      domainResult: domainResult.value,
      safeBrowsingResult: safeBrowsingResult.value,
      history,
    });

    const reply = formatWhatsAppReply(analysis, targetUrl);
    // Store analysis summary as context (not the formatted reply)
    const historySummary = `Analicé: "${originalText.slice(0, 100)}". Veredicto: ${analysis.verdict}. ${analysis.explanation}`;
    pushHistory(from, originalText, historySummary);
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("webhook error:", err);
  }
});

function formatWhatsAppReply(analysis, url) {
  const isOutOfScope = analysis.verdict === "FUERA_DE_SCOPE";
  const icon = analysis.verdict === "FRAUDE" ? "🚨" : analysis.verdict === "LEGÍTIMO" ? "✅" : analysis.verdict === "SOSPECHOSO" ? "⚠️" : null;

  const lines = [
    icon ? `${icon} *${analysis.verdict}*` : null,
    icon ? "" : null,
    analysis.explanation,
    "",
    analysis.redFlags.length > 0 ? `*Señales de alerta:*\n${analysis.redFlags.map((f) => `• ${f}`).join("\n")}` : null,
    analysis.redFlags.length > 0 ? "" : null,
    isOutOfScope ? analysis.recommendation : `*Qué hacer:* ${analysis.recommendation}`,
    "",
    "_Ángel 👼 — ImpactLab · Protección contra fraude bancario en Chile_",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

async function sendWhatsAppMessage(to, text) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    console.error(`WhatsApp send error: ${res.status} to ${to}`);
  }
}

async function getMediaUrl(mediaId) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  const data = await res.json();
  return data.url;
}

async function downloadMediaAsBase64(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  const buffer = await res.buffer();
  return buffer.toString("base64");
}

module.exports = router;
