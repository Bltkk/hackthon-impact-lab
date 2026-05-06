const fetch = require("node-fetch");

const PHISHTANK_URL = "https://checkurl.phishtank.com/checkurl/";

/**
 * Checks a URL against PhishTank database.
 * Returns { isPhishing, inDatabase, phishId, verifiedAt }
 * Free tier: ~900 req/hour with app_key, no key = anonymous (lower limit)
 */
async function checkPhishTank(url) {
  const appKey = process.env.PHISHTANK_API_KEY;

  const params = new URLSearchParams({
    url: encodeURIComponent(url),
    format: "json",
  });
  if (appKey) params.set("app_key", appKey);

  const res = await fetch(PHISHTANK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    console.error(`PhishTank API error: ${res.status}`);
    return { isPhishing: false, inDatabase: false, phishId: null, verifiedAt: null };
  }

  const data = await res.json();
  const result = data.results;

  return {
    isPhishing: result.in_database && result.valid,
    inDatabase: result.in_database,
    phishId: result.phish_id ?? null,
    verifiedAt: result.verified_at ?? null,
  };
}

module.exports = { checkPhishTank };
