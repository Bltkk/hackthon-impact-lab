const fetch = require("node-fetch");

const VT_BASE = "https://www.virustotal.com/api/v3";

/**
 * Analyzes a URL with VirusTotal.
 * Returns { maliciousCount, suspiciousCount, harmlessCount, permalink }
 */
async function checkVirusTotal(url) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    console.warn("VIRUSTOTAL_API_KEY not set — skipping VirusTotal check");
    return null;
  }

  // Submit URL for analysis
  const submitRes = await fetch(`${VT_BASE}/urls`, {
    method: "POST",
    headers: {
      "x-apikey": apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  if (!submitRes.ok) {
    console.error(`VirusTotal submit error: ${submitRes.status}`);
    return null;
  }
  const submitData = await submitRes.json();
  const analysisId = submitData.data.id;

  // Fetch analysis result (poll once — for async queue use BullMQ)
  await new Promise((r) => setTimeout(r, 3000));
  const resultRes = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
    headers: { "x-apikey": apiKey },
  });

  if (!resultRes.ok) {
    console.error(`VirusTotal result error: ${resultRes.status}`);
    return null;
  }
  const result = await resultRes.json();
  const stats = result.data.attributes.stats;

  return {
    maliciousCount: stats.malicious ?? 0,
    suspiciousCount: stats.suspicious ?? 0,
    harmlessCount: stats.harmless ?? 0,
    permalink: `https://www.virustotal.com/gui/url/${analysisId}`,
  };
}

module.exports = { checkVirusTotal };
