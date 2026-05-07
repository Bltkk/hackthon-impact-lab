const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { analyzePhishing } = require("../services/claude");
const { checkDomain } = require("../services/domainCheck");
const { checkSafeBrowsing } = require("../services/safeBrowsing");
const { extractUrl } = require("../services/urlExtractor");
const { getHistory, pushHistory } = require("../services/conversation");

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Warn at startup if WhatsApp vars are missing
if (!WA_TOKEN || !WA_PHONE_ID || !VERIFY_TOKEN) {
  console.warn("[webhook] ⚠️  Missing WhatsApp env vars:", {
    WHATSAPP_TOKEN: !!WA_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: !!WA_PHONE_ID,
    WHATSAPP_VERIFY_TOKEN: !!VERIFY_TOKEN,
  });
}

// WhatsApp webhook verification (GET)
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[webhook] ✅ WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  console.warn("[webhook] ❌ Webhook verification failed — token mismatch or wrong mode");
  res.sendStatus(403);
});

// Incoming message handler (POST)
router.post("/", async (req, res) => {
  // Acknowledge immediately — WhatsApp requires fast 200 response
  res.sendStatus(200);

  let from = null;
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return;

    from = message.from;
    console.log(`[webhook] 📨 Message from ${from}, type=${message.type}`);

    let originalText = "";
    let targetUrl = null;
    let imageBase64 = null;
    let imageMediaType = null;

    if (message.type === "text") {
      originalText = message.text.body;
      targetUrl = extractUrl(originalText);
    } else if (message.type === "image") {
      try {
        const mediaId = message.image.id;
        const mediaInfo = await getMediaInfo(mediaId);
        imageBase64 = await downloadMediaAsBase64(mediaInfo.url);
        imageMediaType = mediaInfo.mimeType || "image/jpeg";
        originalText = message.image.caption || "";
      } catch (imgErr) {
        console.error("[webhook] image download error:", imgErr.message);
        await sendWhatsAppMessage(from, "No pude descargar la imagen 😕\n\nCopia y pega el texto del mensaje sospechoso y lo reviso al tiro.");
        return;
      }
    } else {
      await sendWhatsAppMessage(from, "Envíame el mensaje sospechoso como texto o pantallazo para analizarlo 🔍");
      return;
    }

    if (!originalText && !targetUrl && !imageBase64) {
      await sendWhatsAppMessage(from, "No encontré texto ni enlace en tu mensaje. Intenta reenviar el SMS completo.");
      return;
    }

    const history = await getHistory(from);
    console.log(`[webhook] 📚 History: ${history.length} turns for ${from}`);

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
      imageBase64,
      imageMediaType,
    });

    console.log(`[webhook] 🔍 Verdict for ${from}: ${analysis.verdict} (${analysis.confidence}%)`);

    const reply = formatWhatsAppReply(analysis, targetUrl);

    const userForHistory = originalText?.trim().length > 0
      ? originalText
      : imageBase64
        ? "[Captura de pantalla enviada para análisis]"
        : "[mensaje vacío]";
    const historySummary = `Análisis: ${analysis.verdict}. ${analysis.explanation}`;
    await pushHistory(from, userForHistory, historySummary);

    await sendWhatsAppMessage(from, reply);
    console.log(`[webhook] ✅ Reply sent to ${from}`);
  } catch (err) {
    console.error("[webhook] ❌ Error processing message:", err.message, err.stack);
    // Notify the user so they don't get silence
    if (from) {
      try {
        await sendWhatsAppMessage(
          from,
          "Ocurrió un error al analizar tu mensaje 😕\nIntenta de nuevo en unos segundos. Si el problema persiste, envíame el texto copiado directamente."
        );
      } catch (sendErr) {
        console.error("[webhook] Could not send error reply:", sendErr.message);
      }
    }
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
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.error("[webhook] Cannot send — WA_TOKEN or WA_PHONE_ID not set");
    return;
  }
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
    const body = await res.text().catch(() => "");
    console.error(`[webhook] WhatsApp send error: HTTP ${res.status} to ${to} — ${body}`);
  }
}

async function getMediaInfo(mediaId) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!res.ok) throw new Error(`getMediaInfo failed: HTTP ${res.status}`);
  const data = await res.json();
  return { url: data.url, mimeType: data.mime_type };
}

async function downloadMediaAsBase64(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!res.ok) throw new Error(`downloadMedia failed: HTTP ${res.status}`);
  const buffer = await res.buffer();
  return buffer.toString("base64");
}

module.exports = router;
