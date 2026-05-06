const fetch = require("node-fetch");

const SAFE_BROWSING_URL =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

/**
 * Checks a URL against Google Safe Browsing API v4.
 * Returns { isMalicious, threats }
 */
async function checkSafeBrowsing(url) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_SAFE_BROWSING_KEY not set — skipping Safe Browsing check");
    return { isMalicious: false, threats: [] };
  }

  const body = {
    client: { clientId: "impaclab-phishing", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  const res = await fetch(`${SAFE_BROWSING_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Safe Browsing API error: ${res.status}`);
    return { isMalicious: false, threats: [] };
  }

  const data = await res.json();
  const threats = data.matches?.map((m) => m.threatType) ?? [];
  return { isMalicious: threats.length > 0, threats };
}

module.exports = { checkSafeBrowsing };
