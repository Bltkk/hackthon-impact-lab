const path = require("path");
const fs = require("fs");

const ARTICULOS_PATH = path.join(__dirname, "../legal/output/articulos_finales.json");

// Topics that are directly relevant to phishing analysis
const PHISHING_TOPICS = new Set([
  "fraude_digital",
  "phishing_suplantacion",
  "acceso_ilicito",
  "sancion_delito",
  "derecho_victima",
]);

// Topics relevant when a data breach / personal data exposure is detected
const DATA_BREACH_TOPICS = new Set([
  "datos_personales",
  "reporte_incidentes",
  "ciberseguridad",
]);

let _cache = null;

function loadArticulos() {
  if (_cache) return _cache;
  if (!fs.existsSync(ARTICULOS_PATH)) {
    console.warn("[legalContext] articulos_finales.json not found — run the Python pipeline first");
    return null;
  }
  _cache = JSON.parse(fs.readFileSync(ARTICULOS_PATH, "utf-8"));
  return _cache;
}

/**
 * Returns a formatted string of relevant legal articles to inject into the
 * Claude prompt context, based on the analysis signals.
 *
 * @param {Object} options
 * @param {boolean} options.isMalicious - true if any signal flagged the URL
 * @param {boolean} options.hasDataSignal - true if personal data exposure detected
 * @param {number}  options.maxArticles  - cap to avoid bloating the prompt (default 6)
 */
function getLegalContext({ isMalicious = false, hasDataSignal = false, maxArticles = 6 } = {}) {
  const data = loadArticulos();
  if (!data) return "";

  const relevantTopics = new Set(PHISHING_TOPICS);
  if (hasDataSignal) DATA_BREACH_TOPICS.forEach((t) => relevantTopics.add(t));

  // Priority order: sancion_delito and derecho_victima first (most useful for verdict)
  const PRIORITY = ["sancion_delito", "derecho_victima", "fraude_digital", "phishing_suplantacion"];

  const filtered = data.articulos
    .filter((a) => relevantTopics.has(a.topico))
    .sort((a, b) => {
      const pa = PRIORITY.indexOf(a.topico);
      const pb = PRIORITY.indexOf(b.topico);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    })
    .slice(0, maxArticles);

  if (filtered.length === 0) return "";

  const lines = filtered.map(
    (a) => `[${a.fuente} Art. ${a.numero}] ${a.texto.slice(0, 300).replace(/\s+/g, " ")}…`
  );

  return `\nARTÍCULOS LEGALES APLICABLES:\n${lines.join("\n")}`;
}

/**
 * Returns a minimal citation list for including in the verdict explanation.
 * e.g. ["LEY_21459 Art. 7", "LEY_21459 Art. 8"]
 */
function getCitations({ isMalicious = false, hasDataSignal = false } = {}) {
  const data = loadArticulos();
  if (!data) return [];

  const relevantTopics = new Set(PHISHING_TOPICS);
  if (hasDataSignal) DATA_BREACH_TOPICS.forEach((t) => relevantTopics.add(t));

  return data.articulos
    .filter((a) => relevantTopics.has(a.topico))
    .slice(0, 4)
    .map((a) => `${a.fuente} Art. ${a.numero}`);
}

module.exports = { getLegalContext, getCitations };
